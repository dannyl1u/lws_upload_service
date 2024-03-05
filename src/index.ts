import express from "express";
import cors from "cors";
import simpleGit from "simple-git";
import path from "path";
import { promises as fs } from "fs";
import { uploadFile } from "./gcs";
import { createClient } from "redis";

const publisher = createClient();
publisher.connect();

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
        const id = Math.random().toString(36).substring(5);

        await simpleGit().clone(repoUrl, path.join(__dirname, `output/${id}`));

        const files = await getAllFiles(path.join(__dirname, `output/${id}`));

        files.forEach(async (file: string) => {
            const relativePath = path.relative(__dirname, file);
            await uploadFile(file, relativePath);
        });

        // wait for all files to be uploaded
        await new Promise((resolve) => setTimeout(resolve, 1000));

        publisher.lPush("build-queue", id);
        publisher.hSet("status", id, "uploaded");

        res.json({
            id: id
        });

        // await fs.rm(``, { recursive: true });
    } catch (error) {
        console.error("Error uploading to GCS:", error);
        res.status(500).send("Failed to upload");
    }
});

app.get("/status", async (req, res) => {
    const id = req.query.id;
    if (typeof id !== 'string') {
        res.status(400).send("Invalid id");
        return;
    }
    const response = await publisher.hGet("status", id);
    res.json({
        status: response
    });
});

app.listen(8000, () => console.log("Server running on port 8000"));
