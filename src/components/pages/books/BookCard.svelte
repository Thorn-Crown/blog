<script lang="ts">
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import type { Book, BookStatus } from "@/types/book";

interface Props {
	book: Book;
}
const { book } = $props();

const STATUS_COLORS: Record<BookStatus, string> = {
	wish: "bg-blue-500",
	reading: "bg-yellow-500",
	read: "bg-green-500",
	"on-hold": "bg-orange-500",
	dropped: "bg-red-500",
};

const STATUS_KEYS: Record<BookStatus, I18nKey> = {
	wish: I18nKey.booksFilterWish,
	reading: I18nKey.booksFilterReading,
	read: I18nKey.booksFilterRead,
	"on-hold": I18nKey.booksFilterOnHold,
	dropped: I18nKey.booksFilterDropped,
};

let coverFailed = $state(false);
let coverLoaded = $state(false);
let imgEl = $state<HTMLImageElement | undefined>(undefined);

// 兜底：若图片在 Svelte 水合前就已完成加载，onload 不会再触发，
// 需主动读取 complete 状态，否则封面会一直停留在透明态（看起来是空白）。
$effect(() => {
	if (!imgEl?.complete) return;
	if (imgEl.naturalWidth > 0) {
		coverLoaded = true;
	} else {
		coverFailed = true;
	}
});

function handleLoad() {
	coverLoaded = true;
}

function handleError() {
	coverFailed = true;
}

const statusText = $derived(i18n(STATUS_KEYS[book.status as BookStatus]));
const visibleTags = $derived((book.tags ?? []).slice(0, 3));
const hiddenTagCount = $derived(
	Math.max((book.tags?.length ?? 0) - visibleTags.length, 0),
);
const tag = $derived(book.link ? "a" : "article");
</script>

<svelte:element
	this={tag}
	{...(book.link
		? {
				href: book.link,
				target: "_blank",
				rel: "noopener noreferrer nofollow",
			}
		: {})}
	class="group relative overflow-hidden rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02] block"
>
	<div class="aspect-2/3 relative overflow-hidden">
		{#if !coverFailed}
			<div
				class="lqip-placeholder absolute inset-0 pointer-events-none"
				style="background: var(--muted)"
				aria-hidden="true"
			></div>
			<img
				bind:this={imgEl}
				src={book.cover}
				alt={book.title}
				class="w-full h-full object-cover pointer-events-none transition-all duration-500 ease-out group-hover:scale-105 {coverLoaded
					? 'opacity-100'
					: 'opacity-0'}"
				loading="lazy"
				decoding="async"
				onload={handleLoad}
				onerror={handleError}
			/>
		{:else}
			<div
				class="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
			>
				<div class="text-gray-400 text-4xl">📖</div>
			</div>
		{/if}

		<!-- 状态 badge -->
		<div
			class="absolute top-2 left-2 px-2 py-1 rounded-full text-xs text-white font-medium {STATUS_COLORS[book
				.status as BookStatus]}"
		>
			{statusText}
		</div>

		<!-- 评分 badge -->
		{#if book.rating && book.rating > 0}
			<div
				class="absolute top-2 right-2 px-2 py-1 rounded-full text-xs text-white font-medium bg-black/50 backdrop-blur-sm flex items-center gap-1"
			>
				<span class="text-yellow-400">⭐</span>
				{book.rating}
			</div>
		{/if}

		<!-- 渐变遮罩 + 信息 -->
		<div
			class="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent"
		></div>
		<div class="absolute bottom-0 left-0 right-0 p-3">
			<h3 class="font-bold text-sm text-white line-clamp-2 drop-shadow-lg">
				{book.title}
			</h3>
			{#if book.author}
				<p class="text-xs text-white/70 mt-0.5 line-clamp-1">{book.author}</p>
			{/if}
			{#if book.year}
				<p class="text-xs text-white/50 mt-0.5">{book.year}</p>
			{/if}
			{#if book.review}
				<p
					class="text-xs text-white/80 line-clamp-1 mt-1 leading-relaxed"
					title={book.review}
				>
					{book.review}
				</p>
			{/if}
			{#if visibleTags.length > 0}
				<div class="flex flex-wrap gap-1 mt-1.5">
					{#each visibleTags as t}
						<span
							class="text-[0.6rem] px-1.5 py-0.5 rounded bg-white/20 text-white/90 backdrop-blur-sm"
						>
							{t}
						</span>
					{/each}
					{#if hiddenTagCount > 0}
						<span
							class="text-[0.6rem] px-1.5 py-0.5 rounded bg-white/20 text-white/60 backdrop-blur-sm"
						>
							+{hiddenTagCount}
						</span>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</svelte:element>

<style>
	.line-clamp-2 {
		display: -webkit-box;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.line-clamp-1 {
		display: -webkit-box;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
