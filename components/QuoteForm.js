"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import DatePicker from "@/components/DatePicker";

const initial = {
  company_name: "",
  contact_name: "",
  phone1: "",
  phone2: "",
  phone3: "",
  email: "",
  product: "",
  usage: "",
  event_start: "",
  event_end: "",
  address: "",
  address_detail: "",
  message: "",
};

function Label({ children, required }) {
  return (
    <label className="mb-2 block text-sm font-bold text-ink">
      {children}
      {required && <span className="ml-1 text-primary">•</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-ink/15 px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary";

export default function QuoteForm() {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [today, setToday] = useState(""); // 오늘 이전 날짜 선택 방지용

  useEffect(() => {
    const d = new Date();
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setToday(s);
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // 연락처: 숫자만 + 다 차면 자동 다음칸, 빈칸에서 Backspace면 이전칸
  const phone1Ref = useRef(null);
  const phone2Ref = useRef(null);
  const phone3Ref = useRef(null);

  const handlePhone = (key, maxLen, nextRef) => (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, maxLen);
    setForm((f) => ({ ...f, [key]: v }));
    if (v.length >= maxLen && nextRef?.current) nextRef.current.focus();
  };
  const handlePhoneBack = (prevRef) => (e) => {
    if (e.key === "Backspace" && !e.target.value && prevRef?.current) {
      prevRef.current.focus();
    }
  };

  // 주소 검색 (Daum 우편번호 서비스 — 무료, 키 불필요)
  const detailRef = useRef(null);
  const openPostcode = () => {
    const open = () =>
      new window.daum.Postcode({
        oncomplete: (data) => {
          setForm((f) => ({
            ...f,
            address: data.roadAddress || data.jibunAddress,
          }));
          detailRef.current?.focus();
        },
      }).open();

    if (window.daum && window.daum.Postcode) {
      open();
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = open;
    document.body.appendChild(script);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    // 필수값 체크
    const required = [
      form.company_name,
      form.contact_name,
      form.phone1,
      form.phone2,
      form.phone3,
      form.email,
      form.product,
      form.usage,
      form.event_start,
      form.event_end,
      form.address,
    ];
    if (required.some((v) => !String(v).trim())) {
      setErrorMsg("필수 항목(•)을 모두 입력해주세요.");
      return;
    }

    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.from("inquiries").insert({
      company_name: form.company_name,
      contact_name: form.contact_name,
      phone: `${form.phone1}-${form.phone2}-${form.phone3}`,
      email: form.email,
      product: form.product,
      usage: form.usage,
      event_start: form.event_start,
      event_end: form.event_end,
      address: form.address,
      address_detail: form.address_detail,
      message: form.message,
    });

    if (error) {
      console.error("inquiry insert:", error.message);
      setStatus("error");
      setErrorMsg("전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setStatus("done");
    setForm(initial);
  };

  if (status === "done") {
    return (
      <div className="rounded-xl border border-ink/10 bg-cream px-6 py-16 text-center">
        <p className="font-heading text-2xl font-extrabold text-primary">
          문의가 접수되었습니다
        </p>
        <p className="mt-3 text-sm text-ink/70">
          빠른 시일 내에 담당자가 연락드리겠습니다. 감사합니다.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 rounded-full border border-ink/20 px-5 py-2 text-sm font-medium text-ink transition hover:border-primary hover:text-primary"
        >
          다시 작성하기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h2 className="border-b border-ink/15 pb-3 text-xl font-bold text-ink">
        고객정보
      </h2>

      <div className="mt-6 space-y-6">
        <div>
          <Label required>업체명</Label>
          <input className={inputCls} value={form.company_name} onChange={set("company_name")} />
        </div>

        <div>
          <Label required>담당자명</Label>
          <input className={inputCls} value={form.contact_name} onChange={set("contact_name")} />
        </div>

        <div>
          <Label required>연락처</Label>
          <div className="flex items-center gap-2">
            <input
              ref={phone1Ref}
              className={`${inputCls} w-20 text-center`}
              inputMode="numeric"
              maxLength={3}
              value={form.phone1}
              onChange={handlePhone("phone1", 3, phone2Ref)}
            />
            <span className="text-ink/40">-</span>
            <input
              ref={phone2Ref}
              className={`${inputCls} w-24 text-center`}
              inputMode="numeric"
              maxLength={4}
              value={form.phone2}
              onChange={handlePhone("phone2", 4, phone3Ref)}
              onKeyDown={handlePhoneBack(phone1Ref)}
            />
            <span className="text-ink/40">-</span>
            <input
              ref={phone3Ref}
              className={`${inputCls} w-24 text-center`}
              inputMode="numeric"
              maxLength={4}
              value={form.phone3}
              onChange={handlePhone("phone3", 4, null)}
              onKeyDown={handlePhoneBack(phone2Ref)}
            />
          </div>
        </div>

        <div>
          <Label required>이메일</Label>
          <input type="email" className={inputCls} value={form.email} onChange={set("email")} />
        </div>

        <div>
          <Label required>문의 제품</Label>
          <input
            className={inputCls}
            placeholder="예: 가챠머신, 룰렛 등"
            value={form.product}
            onChange={set("product")}
          />
        </div>

        <div>
          <Label required>제품 용도</Label>
          <div className="flex flex-col gap-2">
            {["임대", "제작"].map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="usage"
                  value={opt}
                  checked={form.usage === opt}
                  onChange={set("usage")}
                  className="h-4 w-4 accent-primary"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label required>행사 시작일</Label>
          <div className="w-48">
            <DatePicker
              value={form.event_start}
              min={today || undefined}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  event_start: v,
                  event_end: f.event_end && f.event_end < v ? "" : f.event_end,
                }))
              }
            />
          </div>
        </div>

        <div>
          <Label required>행사 종료일</Label>
          <div className="w-48">
            <DatePicker
              value={form.event_end}
              min={form.event_start || today || undefined}
              onChange={(v) => setForm((f) => ({ ...f, event_end: v }))}
            />
          </div>
        </div>

        <div>
          <Label required>장소</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                className={`${inputCls} flex-1 cursor-pointer`}
                placeholder="주소"
                value={form.address}
                readOnly
                onClick={openPostcode}
              />
              <button
                type="button"
                onClick={openPostcode}
                className="shrink-0 whitespace-nowrap rounded-md bg-ink px-4 text-sm font-bold text-white transition hover:bg-black"
              >
                주소 검색
              </button>
            </div>
            <input
              ref={detailRef}
              className={inputCls}
              placeholder="상세주소"
              value={form.address_detail}
              onChange={set("address_detail")}
            />
          </div>
        </div>

        <div>
          <Label>기타 문의사항</Label>
          <textarea
            className={`${inputCls} min-h-[120px] resize-y`}
            value={form.message}
            onChange={set("message")}
          />
        </div>
      </div>

      {errorMsg && (
        <p className="mt-4 text-sm font-medium text-primary">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-8 w-full rounded-md bg-ink py-3.5 text-sm font-bold text-white transition hover:bg-black disabled:opacity-60"
      >
        {status === "sending" ? "전송 중..." : "문의하기"}
      </button>
    </form>
  );
}
