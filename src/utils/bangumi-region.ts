export type BangumiRegion = "cn" | "jp" | "us" | "other";

// 用于判断条目的国家/地区，取自 Bangumi 条目详情接口的全站标签
const REGION_TAGS: Record<Exclude<BangumiRegion, "other">, string[]> = {
	cn: ["中国", "国产", "国漫", "中国动画"],
	jp: ["日本", "日漫"],
	us: ["美国", "美漫", "欧美"],
};

export function classifyRegion(tags: string[]): BangumiRegion {
	const set = new Set(tags);
	if (REGION_TAGS.cn.some((tag) => set.has(tag))) return "cn";
	if (REGION_TAGS.us.some((tag) => set.has(tag))) return "us";
	if (REGION_TAGS.jp.some((tag) => set.has(tag))) return "jp";
	return "other";
}

const CACHE_KEY = "bangumi-region-cache-v1";
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
	concurrency = DEFAULT_CONCURRENCY,
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
				const names: string[] = (data.tags || [])
					.map((tag: { name?: string }) => tag.name)
					.filter((name: unknown): name is string => typeof name === "string");
				const region = classifyRegion(names);
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
