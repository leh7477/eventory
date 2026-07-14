"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCase,
  deleteCase,
  swapCaseOrder,
} from "@/app/admin/(panel)/cases/actions";
import { getMachineSpecs, parseSpecsText } from "@/lib/samples";

const EMPTY_ROW = { label: "", value: "" };

export default function CaseManager({ cases, categories = [] }) {
  const router = useRouter();
  const fileRef = useRef(null);
  const [previews, setPreviews] = useState([]);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [specRows, setSpecRows] = useState([{ ...EMPTY_ROW }]);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  // 카테고리 선택 시: 기본 스펙 + 검색 제목 자동 채움 (이후 수정 가능)
  const onCategoryChange = (e) => {
    const id = e.target.value;
    setCategoryId(id);
    const cat = categories.find((c) => String(c.id) === String(id));
    if (!cat) return setSpecRows([{ ...EMPTY_ROW }]);
    // 카테고리에 저장된 기본 스펙 우선, 없으면 하드코딩 기본값
    const saved = parseSpecsText(cat.default_specs);
    setSpecRows(
      saved && saved.length ? saved : getMachineSpecs(cat.name).map((s) => ({ ...s }))
    );
    // 검색 제목: 앞의 장비명만 카테고리로 바뀜
    setSeoTitle(
      `${cat.name} 렌탈·대여·임대 | 기업행사·축제·팝업스토어 이벤트 맞춤 제작`
    );
  };

  const setRow = (i, key, val) =>
    setSpecRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  const addRow = () => setSpecRows((rows) => [...rows, { ...EMPTY_ROW }]);
  const removeRow = (i) => setSpecRows((rows) => rows.filter((_, idx) => idx !== i));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (fn) =>
    startTransition(async () => {
      setError("");
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    });

  const onPick = (e) => {
    const files = Array.from(e.target.files ?? []);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const onAdd = (e) => {
    e.preventDefault();
    const files = fileRef.current?.files;
    if (!title.trim()) return setError("제목(장비명)을 입력하세요.");
    if (!files || files.length === 0) return setError("사진을 1장 이상 선택하세요.");
    const specsText = specRows
      .filter((r) => r.label.trim() || r.value.trim())
      .map((r) => `${r.label.trim()}: ${r.value.trim()}`)
      .join("\n");

    const fd = new FormData();
    fd.append("title", title);
    fd.append("category_id", categoryId);
    fd.append("specs", specsText);
    fd.append("description", description);
    fd.append("tags", tags);
    fd.append("seo_title", seoTitle);
    fd.append("seo_description", seoDescription);
    for (const f of files) fd.append("images", f);
    run(async () => {
      const res = await createCase(fd);
      if (!res?.error) {
        setTitle("");
        setCategoryId("");
        setSpecRows([{ ...EMPTY_ROW }]);
        setDescription("");
        setTags("");
        setSeoTitle("");
        setSeoDescription("");
        setPreviews([]);
        if (fileRef.current) fileRef.current.value = "";
      }
      return res;
    });
  };

  return (
    <div>
      {/* 추가 폼 */}
      <form onSubmit={onAdd} className="rounded-xl border border-ink/10 bg-white p-5">
        <p className="text-sm font-bold text-ink">새 Stories 추가</p>

        <div className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink/60">제목 (장비명)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 가챠머신"
                className="w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink/60">행사명 / 설명</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 쇼핑몰 오픈 기념 행사"
                className="w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">카테고리</label>
            <select
              value={categoryId}
              onChange={onCategoryChange}
              className="w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="">선택 안 함</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">
              장비 정보 / 스펙 (카테고리 선택 시 기본값 자동 입력 · 항목명 / 내용)
            </label>
            <div className="space-y-2">
              {specRows.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={r.label}
                    onChange={(e) => setRow(i, "label", e.target.value)}
                    placeholder="항목 (예: 기기 사이즈)"
                    className="w-36 shrink-0 rounded-md border border-ink/15 px-2.5 py-2 text-sm outline-none focus:border-primary"
                  />
                  <input
                    value={r.value}
                    onChange={(e) => setRow(i, "value", e.target.value)}
                    placeholder="내용 (예: W 500 × D 500 × H 1600 mm)"
                    className="flex-1 rounded-md border border-ink/15 px-2.5 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="shrink-0 rounded-md border border-ink/15 px-2 py-2 text-xs text-ink/40 hover:bg-ink/5"
                    aria-label="행 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addRow}
                className="rounded-md border border-dashed border-ink/20 px-3 py-1.5 text-xs font-medium text-ink/60 hover:bg-ink/5"
              >
                + 항목 추가
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">
              태그 (쉼표로 구분, 선택)
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="예: 가챠머신, 쇼핑몰, 오픈행사"
              className="w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          {/* 검색(SEO) 정보 */}
          <div className="rounded-lg border border-dashed border-ink/15 p-3">
            <p className="mb-2 text-xs font-bold text-ink/70">
              🔍 검색(네이버/구글) 정보 · 선택
            </p>
            <div className="space-y-2">
              <input
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="검색 제목 (비우면 자동: 제목 + 렌탈·대여·임대 | 기업행사·…)"
                className="w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="검색 설명 (비우면 위 행사명/설명으로 자동 · 검색결과에 보이는 요약 문구, 80~120자 권장)"
                className="min-h-[64px] w-full resize-y rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-ink/40">
              비워두면 자동 생성됩니다. 직접 쓰면 네이버/구글 검색결과에 그 문구가
              노출돼요.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink/60">
              현장 사진 (여러 장 가능, 첫 장이 대표 이미지)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onPick}
              className="block w-full text-sm text-ink/70 file:mr-3 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-black"
            />
            {previews.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {previews.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="h-20 w-20 rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-medium text-primary">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 rounded-md bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
        >
          {pending ? "업로드 중..." : "사례 추가"}
        </button>
      </form>

      {/* 목록 */}
      <div className="mt-6 space-y-3">
        {cases.length === 0 ? (
          <p className="rounded-xl border border-dashed border-ink/15 py-12 text-center text-sm text-ink/40">
            등록된 사례가 없습니다.
          </p>
        ) : (
          cases.map((c, i) => (
            <div key={c.id} className="flex items-center gap-4 rounded-xl border border-ink/10 bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.image_url}
                alt={c.title}
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{c.title}</p>
                <p className="truncate text-xs text-ink/50">{c.description}</p>
              </div>

              <div className="flex flex-col gap-0.5">
                <button
                  disabled={pending || i === 0}
                  onClick={() => run(() => swapCaseOrder(c, cases[i - 1]))}
                  className="px-1.5 text-ink/40 hover:text-ink disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  disabled={pending || i === cases.length - 1}
                  onClick={() => run(() => swapCaseOrder(c, cases[i + 1]))}
                  className="px-1.5 text-ink/40 hover:text-ink disabled:opacity-30"
                >
                  ↓
                </button>
              </div>

              <button
                onClick={() => {
                  if (confirm(`'${c.title}' 사례를 삭제할까요?`))
                    run(() => deleteCase(c.id));
                }}
                disabled={pending}
                className="rounded-md border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
              >
                삭제
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
