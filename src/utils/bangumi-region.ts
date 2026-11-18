export type BangumiRegion = "cn" | "jp" | "us" | "other";

type BangumiTag = { name?: string; count?: number };

// 用于判断条目的国家/地区，取自 Bangumi 条目详情接口的全站标签
const REGION_TAGS: Record<Exclude<BangumiRegion, "other">, string[]> = {
	cn: ["中国", "国产", "国漫", "国创", "中国动画", "国产动画"],
	jp: ["日本", "日漫"],
	us: ["美国", "美漫", "欧美"],
};

const REGION_PRIORITY: Exclude<BangumiRegion, "other">[] = ["cn", "us", "jp"];

function toTagName(tag: string | BangumiTag): string | undefined {
	return typeof tag === "string" ? tag : tag.name;
}

function toTagCount(tag: string | BangumiTag): number {
	return typeof tag === "string" ? 0 : (tag.count ?? 0);
}

function pickRegion(names: string[]): BangumiRegion | null {
	const set = new Set(names);
	for (const region of REGION_PRIORITY) {
		if (REGION_TAGS[region].some((tag) => set.has(tag))) return region;
	}
	return null;
}

/**
 * 判断条目的国家/地区。
 * 优先使用 Bangumi 维护的 meta_tags（由 wiki 编辑整理，比用户标签可靠），
 * 缺失时再按全站标签的投票数取最高的地区标签。
 * 例：「赛博朋克：边缘行者」带有少量「欧美」标签，但 meta_tags 为「日本」，
 * 且「日本」标签票数远高于「欧美」，因此判定为日漫。
 */
export function classifyRegion(
	tags: Array<string | BangumiTag>,
	metaTags: string[] = [],
): BangumiRegion {
	const metaRegion = pickRegion(metaTags);
	if (metaRegion) return metaRegion;

	const scores: Record<Exclude<BangumiRegion, "other">, number> = {
		cn: 0,
		us: 0,
		jp: 0,
	};

	for (const tag of tags) {
		const name = toTagName(tag);
		if (!name) continue;
		const count = toTagCount(tag);
		for (const region of REGION_PRIORITY) {
			if (REGION_TAGS[region].includes(name)) {
				scores[region] = Math.max(scores[region], count);
			}
		}
	}

	let best: Exclude<BangumiRegion, "other"> | null = null;
	for (const region of REGION_PRIORITY) {
		if (scores[region] <= 0) continue;
		if (best === null || scores[region] > scores[best]) best = region;
	}

	return best ?? "other";
}

const CACHE_KEY = "bangumi-region-cache-v2";
const DEFAULT_CONCURRENCY = 6;

type RegionCache = Record<string, BangumiRegion>;

function readCache(): RegionCache {
	if (typeof window === "undefined") return {};
	try {
		const raw = window.sessionStorage.getItem(CACHE_KEY);
		return raw ? (JSON.parse(raw) as RegionCache) : {};
	} catch {
		return {};
	}
}

function writeCache(cache: RegionCache) {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
	} catch {}
}

/**
 * 批量获取条目的地区分类。
 * 收藏接口返回的 subject.tags 不完整，因此逐个请求条目详情取全站标签，
 * 结果按条目 ID 缓存在 sessionStorage，避免每次刷新重复请求。
 */
export async function fetchBangumiRegions(
	apiUrl: string,
	ids: number[],
	concurrency: number = DEFAULT_CONCURRENCY,
): Promise<Record<number, BangumiRegion>> {
	const cache = readCache();
	const result: Record<number, BangumiRegion> = {};
	const pending: number[] = [];

	for (const id of ids) {
		const cached = cache[String(id)];
		if (cached) {
			result[id] = cached;
		} else {
			pending.push(id);
		}
	}

	let cursor = 0;
	const workerCount = Math.min(concurrency, pending.length);
	const workers = Array.from({ length: workerCount }, async () => {
		while (cursor < pending.length) {
			const id = pending[cursor];
			cursor += 1;
			try {
				const resp = await fetch(`${apiUrl}/v0/subjects/${id}`, {
					headers: { Accept: "application/json" },
				});
				if (!resp.ok) {
					result[id] = "other";
					continue;
				}
				const data = await resp.json();
				const tags: BangumiTag[] = Array.isArray(data.tags) ? data.tags : [];
				const metaTags: string[] = Array.isArray(data.meta_tags)
					? data.meta_tags.filter(
							(name: unknown): name is string => typeof name === "string",
						)
					: [];
				const region = classifyRegion(tags, metaTags);
				result[id] = region;
				cache[String(id)] = region;
			} catch {
				result[id] = "other";
			}
		}
	});

	await Promise.all(workers);
	writeCache(cache);
	return result;
}
