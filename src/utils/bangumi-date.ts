import type { UserSubjectCollection } from "@/types/bangumi";

// 部分早年条目的结构化 date 为空，年份只写在 infobox 里
const DATE_INFOBOX_KEYS = [
	"放送开始",
	"上映年度",
	"上映时间",
	"发售日",
	"开始",
];

type InfoboxValue = string | Array<{ v?: string }> | undefined;
type Infobox = Array<{ key: string; value: InfoboxValue }> | undefined;

// 补全的年份按条目 ID 缓存在 localStorage，跨会话复用，避免重复请求详情
const DATE_CACHE_KEY = "bangumi-date-cache-v1";
const DEFAULT_CONCURRENCY = 6;

function infoboxText(value: InfoboxValue): string {
	if (!value) return "";
	if (typeof value === "string") return value;
	return value.map((entry) => entry?.v ?? "").join(" ");
}

function extractYear(infobox: Infobox): string {
	if (!infobox) return "";
	for (const key of DATE_INFOBOX_KEYS) {
		const entry = infobox.find((item) => item.key === key);
		const match = infoboxText(entry?.value).match(/\d{4}/);
		if (match) return match[0];
	}
	return "";
}

function readDateCache(): Record<string, string> {
	if (typeof window === "undefined") return {};
	try {
		const raw = window.localStorage.getItem(DATE_CACHE_KEY);
		return raw ? (JSON.parse(raw) as Record<string, string>) : {};
	} catch {
		return {};
	}
}

function writeDateCache(cache: Record<string, string>) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(DATE_CACHE_KEY, JSON.stringify(cache));
	} catch {
		// 存储已满或不可用时静默忽略
	}
}

async function fetchSubjectYear(
	apiUrl: string,
	subjectId: number,
): Promise<string> {
	try {
		const response = await fetch(`${apiUrl}/v0/subjects/${subjectId}`, {
			headers: { Accept: "application/json" },
		});
		if (!response.ok) return "";
		const subject = (await response.json()) as {
			date?: string | null;
			infobox?: Infobox;
		};
		return subject.date?.substring(0, 4) || extractYear(subject.infobox);
	} catch {
		return "";
	}
}

/**
 * 为缺少结构化日期的条目从条目详情 infobox 补全年份。
 * - 已补过的年份按条目 ID 缓存，命中时不再请求；
 * - 缺失的条目并发请求（默认 6 路），避免逐个串行拖慢加载；
 * - 没有任何缺失时直接返回原数组。
 */
export async function fillMissingBangumiDates(
	items: UserSubjectCollection[],
	apiUrl: string,
	concurrency: number = DEFAULT_CONCURRENCY,
): Promise<UserSubjectCollection[]> {
	if (!items.some((item) => item.subject && !item.subject.date)) return items;

	const cache = readDateCache();
	const result: UserSubjectCollection[] = [...items];
	const pending: Array<{ index: number; id: number }> = [];

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (!item.subject || item.subject.date) continue;
		const cached = cache[String(item.subject_id)];
		if (cached) {
			result[i] = { ...item, subject: { ...item.subject, date: cached } };
		} else {
			pending.push({ index: i, id: item.subject_id });
		}
	}

	if (pending.length === 0) return result;

	let cursor = 0;
	const workerCount = Math.min(concurrency, pending.length);
	const workers = Array.from({ length: workerCount }, async () => {
		while (cursor < pending.length) {
			const { index, id } = pending[cursor];
			cursor += 1;
			const year = await fetchSubjectYear(apiUrl, id);
			const original = items[index];
			// pending 中的条目必定带有 subject 且 date 为空
			if (year && original.subject) {
				result[index] = {
					...original,
					subject: { ...original.subject, date: year },
				};
				cache[String(id)] = year;
			}
		}
	});

	await Promise.all(workers);
	writeDateCache(cache);
	return result;
}
