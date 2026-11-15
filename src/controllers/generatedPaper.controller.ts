import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import GeneratedPaper, { type GeneratedPaperDocument } from "../models/generatedPaper.model";
import Note from "../models/note.model";
import Subject from "../models/subject.model";
import { generateMockPaper } from "../services/gemini.service";

const ensurePapersDir = () => {
  const dir = path.join(process.cwd(), "uploads", "papers");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const buildPDF = (paper: GeneratedPaperDocument, outputPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .text(paper.title.toUpperCase(), { align: "center" });

    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Difficulty: ${paper.difficulty.toUpperCase()}`, { align: "center" });
    doc.text(`Duration: ${paper.duration} Minutes`, { align: "center" });
    doc.text(`Total Questions: ${paper.totalQuestions}`, { align: "center" });

    const totalMarks = (paper.questions as any[]).reduce(
      (sum: number, q: any) => sum + (q.marks || 0),
      0
    );
    doc.text(`Total Marks: ${totalMarks}`, { align: "center" });

    doc.moveDown(1);
    doc
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .stroke();
    doc.moveDown(1);

    const sections: { label: string; type: string }[] = [
      { label: "SECTION A — Multiple Choice Questions (MCQ)", type: "mcq" },
      { label: "SECTION B — Structured Questions", type: "structured" },
      { label: "SECTION C — Essay Questions", type: "essay" },
    ];

    sections.forEach(({ label, type }) => {
      const qs = (paper.questions as any[]).filter((q: any) => q.type === type);
      if (qs.length === 0) return;

      doc.addPage();
      doc.fontSize(14).font("Helvetica-Bold").text(label);
      doc.moveDown(0.5);
      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke();
      doc.moveDown(0.5);

      qs.forEach((q: any, i: number) => {
        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(`${i + 1}. ${q.question}  [${q.marks} mark${q.marks > 1 ? "s" : ""}]`);

        if (type === "mcq" && q.options?.length) {
          doc.moveDown(0.3);
          q.options.forEach((opt: string) => {
            doc.fontSize(10).font("Helvetica").text(`      ${opt}`);
          });
        }

        if (type !== "mcq") {
          doc.moveDown(0.5);
          for (let ln = 0; ln < (type === "essay" ? 8 : 4); ln++) {
            const y = doc.y;
            doc
              .moveTo(50, y)
              .lineTo(doc.page.width - 50, y)
              .strokeColor("#cccccc")
              .stroke();
            doc.strokeColor("#000000");
            doc.moveDown(0.6);
          }
        }

        doc.moveDown(0.8);
      });
    });

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
};

export const generatePaper = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const {
      subjectId,
      difficulty = "medium",
      totalQuestions = 25,
      duration = 120,
    } = req.body;

    if (!subjectId) {
      return res.status(400).json({ success: false, message: "subjectId is required" });
    }

    const subject = await Subject.findOne({ _id: subjectId, userId: user.id });
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    const notes = await Note.find({ subjectId, userId: user.id }).select("extractedText");
    const notesContext = notes
      .map((n) => n.extractedText)
      .filter(Boolean)
      .join("\n\n");

    if (!notesContext) {
      return res.status(400).json({
        success: false,
        message: "No notes found for this subject. Upload lecture notes first.",
      });
    }

    const result = await generateMockPaper({
      subjectName: subject.name,
      difficulty: difficulty as "easy" | "medium" | "hard",
      totalQuestions: Number(totalQuestions),
      notesContext,
    });

    const title = `${subject.name} Mock Exam — ${difficulty.toUpperCase()}`;

    const paper = await GeneratedPaper.create({
      title,
      subjectId,
      userId: user.id,
      difficulty,
      totalQuestions: Number(totalQuestions),
      duration: Number(duration),
      questions: result.questions,
      rawResponse: result.rawResponse,
    });

    const papersDir = ensurePapersDir();
    const pdfFilename = `paper-${paper._id}.pdf`;
    const pdfPath = path.join(papersDir, pdfFilename);

    await buildPDF(paper, pdfPath);

    paper.pdfPath = pdfPath;
    await paper.save();

    res.status(201).json({ success: true, paper });
  } catch (error: any) {
    console.error("generatePaper error:", error);

    if (error?.message?.includes("Gemini") || error?.message?.includes("API key")) {
      return res.status(503).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({ success: false, message: "Server Error", error: error?.message });
  }
};

export const getPapers = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const filter: any = { userId: user.id };

    if (req.query.subjectId) filter.subjectId = req.query.subjectId;

    const papers = await GeneratedPaper.find(filter)
      .populate("subjectId", "name code")
      .select("-questions -rawResponse")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: papers.length, papers });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const getPaperById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const paper = await GeneratedPaper.findOne({
      _id: req.params.id,
      userId: user.id,
    }).populate("subjectId", "name code");

    if (!paper) {
      return res.status(404).json({ success: false, message: "Paper not found" });
    }

    res.status(200).json({ success: true, paper });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const downloadPaper = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const paper = await GeneratedPaper.findOne({
      _id: req.params.id,
      userId: user.id,
    }).populate("subjectId", "name code");

    if (!paper) {
      return res.status(404).json({ success: false, message: "Paper not found" });
    }

    if (!paper.pdfPath || !fs.existsSync(paper.pdfPath)) {
      const papersDir = ensurePapersDir();
      const pdfFilename = `paper-${paper._id}.pdf`;
      paper.pdfPath = path.join(papersDir, pdfFilename);
      await buildPDF(paper, paper.pdfPath);
      await paper.save();
    }

    const safeTitle = paper.title.replace(/[^a-z0-9]/gi, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.pdf"`);
    fs.createReadStream(paper.pdfPath).pipe(res);
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

export const deletePaper = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const paper = await GeneratedPaper.findOneAndDelete({
      _id: req.params.id,
      userId: user.id,
    });

    if (!paper) {
      return res.status(404).json({ success: false, message: "Paper not found" });
    }

    if (paper.pdfPath && fs.existsSync(paper.pdfPath)) {
      fs.unlinkSync(paper.pdfPath);
    }

    res.status(200).json({ success: true, message: "Paper deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};
