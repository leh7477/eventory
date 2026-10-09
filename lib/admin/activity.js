/**
 * 문의 처리 이력 (inquiries.activity_log)
 *
 * "누가 언제 무엇을 했는지"를 문의 상세에 시간순으로 남긴다.
 * 원래 문의 화면 안에만 있던 함수인데, 일정 화면에서 행사 기간을 고칠 때도
 * 같은 이력에 남겨야 해서 공용으로 뺐다.
 */

/** 이력 한 줄 추가. 실패해도 본 작업을 막지 않는다(기록은 부가 기능). */
export async function appendActivityLog(admin, inquiryId, by, action) {
  if (!inquiryId || !action) return;
  try {
    const { data } = await admin
      .from("inquiries")
      .select("activity_log")
      .eq("id", inquiryId)
      .maybeSingle();
    const log = Array.isArray(data?.activity_log) ? data.activity_log : [];
    log.push({ at: new Date().toISOString(), by, action });
    await admin.from("inquiries").update({ activity_log: log }).eq("id", inquiryId);
  } catch {
    // 이력 실패로 저장 자체를 되돌리지는 않는다
  }
}
