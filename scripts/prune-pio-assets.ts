// 看板娘资源裁剪构建后脚本
// public/pio/ 下的 Spine 模型及运行时有 15 MiB 左右，而 Astro 会把整个 public/
// 原样拷进 dist/，看板娘开关是关的也一样拷。这里在 astro build 之后按开关删掉
// 用不到的资源，避免白白撑大产物体积。

import fs from "node:fs/promises";
import path from "node:path";
import { spineModelConfig } from "../src/config";
import { resolveSiteRoot } from "./site-root";

// Cloudflare Pages 上产物在 dist/client，本地在 dist，统一对准真实根目录
const DIST_DIR = resolveSiteRoot();

// 看板娘资源根目录（相对 dist/）
const PIO_ROOT = "pio";

/** 递归统计文件或目录占用的字节数，路径不存在则返回 null */
async function sizeOf(target: string): Promise<number | null> {
	let stat: Awaited<ReturnType<typeof fs.stat>>;
	try {
		stat = await fs.stat(target);
	} catch {
		return null;
	}
	if (!stat.isDirectory()) return stat.size;

	const names = await fs.readdir(target);
	let total = 0;
	for (const name of names) {
		total += (await sizeOf(path.join(target, name))) ?? 0;
	}
	return total;
}

/** 删除 dist/ 下的一个路径，返回释放的字节数；路径不存在则返回 null */
async function remove(relPath: string): Promise<number | null> {
	const target = path.join(DIST_DIR, relPath);
	// 空目录/空文件的体积是 0，不能用体积判断存在性，否则会漏删
	const bytes = await sizeOf(target);
	if (bytes === null) return null;

	await fs.rm(target, { recursive: true, force: true });
	console.log(`   ✂ ${relPath} (${(bytes / 1024 / 1024).toFixed(2)} MiB)`);
	return bytes;
}

async function main() {
	if (spineModelConfig.enable) {
		console.log("🎎 Spine model is enabled, keeping pio assets");
		return;
	}

	console.log("🎎 Pruning unused mascot assets in dist/...");
	const bytes = await remove(PIO_ROOT);
	if (bytes === null) {
		console.log("✨ No mascot assets to prune");
		return;
	}
	console.log(
		`✨ Pruned mascot assets, freed ${(bytes / 1024 / 1024).toFixed(2)} MiB`,
	);
}

main().catch((err) => {
	console.error("❌ Failed to prune mascot assets:", err);
	process.exit(1);
});
