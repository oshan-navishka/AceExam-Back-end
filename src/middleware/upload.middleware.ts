import multer from "multer";
import path from "path";
import fs from "fs";

const notesDir = path.join(process.cwd(), "uploads", "notes");
const papersDir = path.join(process.cwd(), "uploads", "papers");

[notesDir, papersDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const noteStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, notesDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const pdfFilter: multer.Options["fileFilter"] = (
  _req,
  file,
  cb
) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"));
  }
};

export const uploadNote = multer({
  storage: noteStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, 
}).single("pdf");
