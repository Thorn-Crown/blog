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
 * 没有任何缺失时直接返回原数组。
 */
export async function fillMissingBangumiDates(
	items: UserSubjectCollection[],
	apiUrl: string,
): Promise<UserSubjectCollection[]> {
	if (!items.some((item) => item.subject && !item.subject.date)) return items;

	const result: UserSubjectCollection[] = [];
	for (const item of items) {
		if (!item.subject || item.subject.date) {
			result.push(item);
			continue;
		}
		const year = await fetchSubjectYear(apiUrl, item.subject_id);
		result.push(
			year ? { ...item, subject: { ...item.subject, date: year } } : item,
		);
	}
	return result;
}
