import express from "express";
import cors from "cors";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs/promises";
import { uploadFile } from "./gcs";

const app = express();
app.use(cors());
app.use(express.json());

async function getAllFiles(dirPath: string): Promise<string[]> {
    let allFiles: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            allFiles = allFiles.concat(await getAllFiles(fullPath));
        } else {
            allFiles.push(fullPath);
        }
    }

    return allFiles;
}

app.post("/upload", async (req, res) => {
    try {
        const repoUrl = req.body.repoUrl;
        const id = Math.random().toString(36).substring(7);
        const clonePath = path.join(__dirname, id);

        await simpleGit().clone(repoUrl, clonePath);
        const allFiles = await getAllFiles(clonePath);

        for (const file of allFiles) {
            const relativePath = path.relative(clonePath, file);
            await uploadFile(file, relativePath);
        }

        res.send("Uploaded to GCS");

        await fs.rm(clonePath, { recursive: true });
    } catch (error) {
        console.error("Error uploading to GCS:", error);
        res.status(500).send("Failed to upload");
    }
});

app.listen(8000, () => console.log("Server running on port 8000"));
