<script lang="ts">
import FilterControls from "@/components/common/FilterControls.svelte";
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import type { Book, BookStatus } from "@/types/book";
import BookCard from "./BookCard.svelte";

interface Props {
	books: Book[];
}
const { books } = $props();

type StatusFilter = "all" | BookStatus;

let activeStatus = $state<StatusFilter>("all");
let activeTag = $state<string>("all");

const counts = $derived.by(() => {
	const c: Record<BookStatus, number> = {
		wish: 0,
		reading: 0,
		read: 0,
		"on-hold": 0,
		dropped: 0,
	};
	for (const b of books) c[b.status] += 1;
	return c;
});

const statusFilters = $derived(
	[
		{ value: "all", label: i18n(I18nKey.booksFilterAll), count: books.length },
		{
			value: "wish",
			label: i18n(I18nKey.booksFilterWish),
			count: counts.wish,
		},
		{
			value: "reading",
			label: i18n(I18nKey.booksFilterReading),
			count: counts.reading,
		},
		{
			value: "read",
			label: i18n(I18nKey.booksFilterRead),
			count: counts.read,
		},
		{
			value: "on-hold",
			label: i18n(I18nKey.booksFilterOnHold),
			count: counts["on-hold"],
		},
		{
			value: "dropped",
			label: i18n(I18nKey.booksFilterDropped),
			count: counts.dropped,
		},
	].filter((f) => f.value === "all" || f.count > 0),
);

const hasTags = $derived(books.some((b) => (b.tags?.length ?? 0) > 0));

const statusFiltered = $derived(
	activeStatus === "all"
		? books
		: books.filter((b) => b.status === activeStatus),
);

const availableTags = $derived(
	Array.from(new Set(statusFiltered.flatMap((b) => b.tags ?? []))).sort(),
);

const tagFilters = $derived([
	{
		value: "all",
		label: i18n(I18nKey.booksFilterAll),
		count: statusFiltered.length,
	},
	...availableTags.map((t) => ({
		value: t,
		label: t,
		count: statusFiltered.filter((b) => (b.tags ?? []).includes(t)).length,
	})),
]);

const filtered = $derived(
	activeTag === "all"
		? statusFiltered
		: statusFiltered.filter((b) => (b.tags ?? []).includes(activeTag)),
);

function handleStatusChange(value: string) {
	activeStatus = value as StatusFilter;
	// 切换状态后，若当前选中的标签在新状态下已不存在，回退到「全部」
	if (activeTag !== "all") {
		const stillExists = books
			.filter((b) => value === "all" || b.status === value)
			.some((b) => (b.tags ?? []).includes(activeTag));
		if (!stillExists) activeTag = "all";
	}
}

function handleTagChange(value: string) {
	activeTag = value;
}
</script>

<div class="books-shelf">
	<FilterControls
		filters={statusFilters}
		activeFilter={activeStatus}
		onFilterChange={handleStatusChange}
	/>

	{#if hasTags}
		<div class="mb-2 text-sm text-(--btn-content)">
			{i18n(I18nKey.booksTagsLabel)}
		</div>
		<FilterControls
			filters={tagFilters}
			activeFilter={activeTag}
			onFilterChange={handleTagChange}
		/>
	{/if}

	{#if filtered.length > 0}
		<div
			class="media-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
		>
			{#each filtered as book (book.id)}
				<BookCard {book} />
			{/each}
		</div>
	{:else}
		<div class="text-center py-16">
			<div class="text-4xl mb-3">📚</div>
			<p class="text-(--btn-content)">{i18n(I18nKey.booksEmpty)}</p>
			<p class="text-sm text-(--btn-content) mt-1" style="opacity: 0.6">
				{i18n(I18nKey.booksEmptyHint)}
			</p>
		</div>
	{/if}
</div>
