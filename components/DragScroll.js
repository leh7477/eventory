"use client";

import { useRef } from "react";

// 마우스로 클릭-드래그해서 가로로 스크롤하는 컨테이너.
// 드래그 후에는 카드 클릭(링크 이동)이 발생하지 않도록 막는다.
export default function DragScroll({ children, className = "" }) {
  const ref = useRef(null);
  const state = useRef({ down: false, startX: 0, startLeft: 0, moved: false });

  const onMouseDown = (e) => {
    const el = ref.current;
    if (!el) return;
    state.current = {
      down: true,
      startX: e.pageX,
      startLeft: el.scrollLeft,
      moved: false,
    };
  };

  const onMouseMove = (e) => {
    const el = ref.current;
    if (!el || !state.current.down) return;
    const dx = e.pageX - state.current.startX;
    if (Math.abs(dx) > 4) state.current.moved = true;
    el.scrollLeft = state.current.startLeft - dx;
  };

  const end = () => {
    state.current.down = false;
  };

  // 드래그였으면 카드 클릭(이동) 취소
  const onClickCapture = (e) => {
    if (state.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      state.current.moved = false;
    }
  };

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={end}
      onMouseLeave={end}
      onClickCapture={onClickCapture}
      className={`cursor-grab select-none overflow-x-auto [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {children}
    </div>
  );
}
