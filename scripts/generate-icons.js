import sharp from "sharp";
import fs from "fs";
import path from "path";

const svgPath = path.resolve("assets/icon.svg");
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
    const targets = [
        { dest: "assets/icon-512.png", size: 512 },
        { dest: "assets/icon-192.png", size: 192 },
        { dest: "assets/apple-touch-icon.png", size: 180 },
        { dest: "favicon.png", size: 64 },
        { dest: "favicon.ico", size: 32 },
        
        // Android mipmap densities
        { dest: "android/app/src/main/res/mipmap-mdpi/ic_launcher.png", size: 48 },
        { dest: "android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png", size: 48 },
        { dest: "android/app/src/main/res/mipmap-hdpi/ic_launcher.png", size: 72 },
        { dest: "android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png", size: 72 },
        { dest: "android/app/src/main/res/mipmap-xhdpi/ic_launcher.png", size: 96 },
        { dest: "android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png", size: 96 },
        { dest: "android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png", size: 144 },
        { dest: "android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png", size: 144 },
        { dest: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", size: 192 },
        { dest: "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png", size: 192 }
    ];

    for (const target of targets) {
        const fullPath = path.resolve(target.dest);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        await sharp(svgBuffer)
            .resize(target.size, target.size)
            .png()
            .toFile(fullPath);
        console.log(`Generated: ${target.dest} (${target.size}x${target.size})`);
    }

    console.log("All app icons successfully generated!");
}

generateIcons().catch(err => {
    console.error("Error generating icons:", err);
    process.exit(1);
});
