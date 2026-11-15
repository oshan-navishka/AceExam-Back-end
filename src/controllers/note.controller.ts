import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import Note from "../models/note.model";

export const uploadNote = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No PDF file uploaded" });
    }

    const { title, subjectId } = req.body;

    if (!title || !subjectId) {
      // clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "title and subjectId are required" });
    }

    let extractedText = "";
    try {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text || "";
    } catch (parseErr) {
      console.warn("PDF text extraction failed:", parseErr);
      // Continue — we still save the note even if extraction fails
    }

    const note = await Note.create({
      title,
      subjectId,
      userId: user.id,
      fileName: req.file.originalname,
      filePath: req.file.path,
      extractedText,
      fileSize: req.file.size,
    });

    res.status(201).json({ success: true, note });
  } catch (error) {
    console.log(error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getNotes = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    let filter: any = user.role === "admin" ? {} : { userId: user.id };

    if (req.query.subjectId) {
      filter.subjectId = req.query.subjectId;
    }

    let notes = await Note.find(filter)
      .populate("subjectId", "name code")
      .select("-extractedText") // don't send full text in list
      .sort({ createdAt: -1 });

    if (notes.length === 0 && user.role !== "admin") {
      const fallbackFilter: any = {};
      if (req.query.subjectId) fallbackFilter.subjectId = req.query.subjectId;
      notes = await Note.find(fallbackFilter)
        .populate("subjectId", "name code")
        .select("-extractedText")
        .sort({ createdAt: -1 });
    }

    res.status(200).json({ success: true, count: notes.length, notes });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getNoteById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    let note = await Note.findOne({
      _id: req.params.id,
      userId: user.id,
    }).populate("subjectId", "name code");

    if (!note) {
      note = await Note.findById(req.params.id).populate("subjectId", "name code");
    }

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    res.status(200).json({ success: true, note });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getNotePdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const note = await Note.findById(id);
    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    let targetPath = note.filePath;
    if (!path.isAbsolute(targetPath)) {
      targetPath = path.join(process.cwd(), targetPath);
    }

    if (!fs.existsSync(targetPath)) {
      const candidates = [
        path.join(process.cwd(), "uploads", "notes", note.fileName),
        path.join(process.cwd(), "uploads", "notes", path.basename(note.filePath)),
      ];
      const found = candidates.find((c) => fs.existsSync(c));
      if (found) {
        targetPath = found;
      } else {
        return res.status(404).json({
          success: false,
          message: "PDF file does not exist on server",
        });
      }
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(note.fileName || "note.pdf")}"`
    );

    res.sendFile(path.resolve(targetPath));
  } catch (error) {
    console.error("getNotePdf error:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const updateNote = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: user.id },
      { title: req.body.title },
      { new: true, runValidators: true }
    );

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    res.status(200).json({ success: true, note });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const deleteNote = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: user.id,
    });

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    // Remove the physical file
    if (note.filePath && fs.existsSync(note.filePath)) {
      fs.unlinkSync(note.filePath);
    }

    res.status(200).json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};
