// /api/notify.js
// PBS컬러랩 퍼스널컬러 자격시험 — 이메일 알림 발송 (네이버 SMTP)
//
// 사용 환경변수 (Vercel 대시보드 → Project → Settings → Environment Variables 에서 등록):
//   SMTP_USER    : 네이버 이메일 주소 (예: pbscolorlab@naver.com)
//   SMTP_PASS    : 네이버 비밀번호 또는 애플리케이션 비밀번호
//   ADMIN_EMAIL  : 본사 관리자 이메일 (새 응시자 등록 시 받음, 보내는 주소와 같아도 됨)
//
// 요청 본문 (POST JSON):
//   type        : 'applied' (응시자 접수 → 관리자에게) | 'approved' (응시 승인 → 응시자에게)
//   name        : 응시자 이름
//   phone       : 응시자 연락처
//   inst        : 기관코드 또는 '개인'
//   pay_method  : 'card' | 'cash'
//   time        : 접수/승인 시각 문자열
//   email       : 응시자 이메일 (approved 타입에서 사용)

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.ADMIN_EMAIL) {
    return res.status(500).json({
      error: 'Email not configured',
      hint: 'Vercel 환경변수 SMTP_USER, SMTP_PASS, ADMIN_EMAIL 이 필요합니다.'
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { type, name, phone, inst, time, pay_method, email } = body || {};
  const ts = time || new Date().toLocaleString('ko-KR');
  const safe = (s) => escapeHtml(s);

  let to, subject, html, text;

  if (type === 'approved') {
    // ============== 응시자에게 보내는 승인 안내 ==============
    if (!email) {
      return res.status(200).json({ ok: false, skipped: true, reason: 'no applicant email' });
    }
    to = email;
    subject = `✅ [PBS컬러랩] ${name || '응시자'}님, 퍼스널컬러 자격시험 응시가 승인되었습니다`;
    html = `
      <div style="font-family:'Apple SD Gothic Neo','맑은 고딕','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
        <div style="background:linear-gradient(135deg,#E91E8C,#9c0062);color:#fff;padding:28px 24px;border-radius:14px 14px 0 0;text-align:center;">
          <div style="font-size:13px;letter-spacing:.15em;opacity:.9;">K-BEAUTY PERSONAL COLOR STYLIST</div>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:800;">✅ 응시 승인 안내</h1>
        </div>
        <div style="border:1.5px solid #fce4f3;border-top:none;border-radius:0 0 14px 14px;padding:24px;">
          <p style="font-size:15px;line-height:1.8;color:#333;margin:0 0 16px;">
            안녕하세요, <b style="color:#9c0062;">${safe(name) || '응시자'}</b> 님.<br>
            PBS컬러랩 퍼스널컬러 스타일리스트 자격시험 <b>응시가 승인</b>되었습니다.
          </p>
          <div style="background:#fce4f3;border-radius:10px;padding:16px 18px;margin:18px 0;color:#7a0858;font-size:14px;line-height:1.7;">
            아래 링크에서 <b>[시험 응시하기]</b>를 누르신 뒤 <b>이름·연락처</b>를 입력하시면 시험을 시작하실 수 있습니다.
            <br><br>
            <a href="https://personalcolor-exam.vercel.app/" style="display:inline-block;background:linear-gradient(135deg,#E91E8C,#9c0062);color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
              시험 응시하러 가기 →
            </a>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:13.5px;margin-top:12px;">
            <tr><td style="padding:8px 0;color:#888;width:35%;">⏱ 제한시간</td><td style="padding:8px 0;color:#333;font-weight:600;">30분</td></tr>
            <tr><td style="padding:8px 0;color:#888;">📊 합격 기준</td><td style="padding:8px 0;color:#333;font-weight:600;">100점 만점 · 70점 이상</td></tr>
            <tr><td style="padding:8px 0;color:#888;">📝 시험 형식</td><td style="padding:8px 0;color:#333;font-weight:600;">객관식 20문항</td></tr>
            <tr><td style="padding:8px 0;color:#888;">🎓 자격 발급</td><td style="padding:8px 0;color:#333;font-weight:600;">합격 즉시 자격증 발급</td></tr>
          </table>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #fce4f3;font-size:12px;color:#999;line-height:1.6;">
            문의: 본사 <b style="color:#7a0858;">1600-7218</b><br>
            자격등록번호 2023-004865 · 주무부처 산업통상부 · 발급기관 PBS컬러랩
          </div>
        </div>
      </div>
    `;
    text = [
      `[PBS컬러랩] ${name || '응시자'}님, 퍼스널컬러 자격시험 응시가 승인되었습니다.`,
      '',
      '아래 링크에서 [시험 응시하기]를 누르신 뒤 이름·연락처를 입력하시면 시험을 시작하실 수 있습니다.',
      'https://personalcolor-exam.vercel.app/',
      '',
      '· 제한시간 30분',
      '· 100점 만점 · 70점 이상 합격',
      '· 객관식 20문항',
      '',
      '문의: 본사 1600-7218'
    ].join('\n');

  } else {
    // ============== 관리자에게 보내는 새 응시자 알림 (기본 'applied') ==============
    to = process.env.ADMIN_EMAIL;
    subject = `🔔 새 응시자 접수: ${name || '응시자'}`;
    html = `
      <div style="font-family:'Apple SD Gothic Neo','맑은 고딕','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
        <h2 style="color:#E91E8C;border-bottom:3px solid #E91E8C;padding-bottom:10px;font-size:20px;margin:0 0 20px;">
          🔔 새 응시자 접수
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:14px;">
          <tr><td style="padding:10px 12px;background:#fff8f3;font-weight:700;width:30%;border-bottom:1px solid #fce4f3;">👤 이름</td><td style="padding:10px 12px;border-bottom:1px solid #fce4f3;">${safe(name)}</td></tr>
          <tr><td style="padding:10px 12px;background:#fff8f3;font-weight:700;border-bottom:1px solid #fce4f3;">📞 연락처</td><td style="padding:10px 12px;border-bottom:1px solid #fce4f3;">${safe(phone)}</td></tr>
          <tr><td style="padding:10px 12px;background:#fff8f3;font-weight:700;border-bottom:1px solid #fce4f3;">📧 이메일</td><td style="padding:10px 12px;border-bottom:1px solid #fce4f3;">${safe(email || '-')}</td></tr>
          <tr><td style="padding:10px 12px;background:#fff8f3;font-weight:700;border-bottom:1px solid #fce4f3;">🏷️ 기관</td><td style="padding:10px 12px;border-bottom:1px solid #fce4f3;">${safe(inst || '개인')}</td></tr>
          <tr><td style="padding:10px 12px;background:#fff8f3;font-weight:700;border-bottom:1px solid #fce4f3;">💳 결제수단</td><td style="padding:10px 12px;border-bottom:1px solid #fce4f3;">${pay_method === 'card' ? '💳 카드 결제 요청' : '🏦 현금 이체'}</td></tr>
          <tr><td style="padding:10px 12px;background:#fff8f3;font-weight:700;">🕐 접수 시각</td><td style="padding:10px 12px;">${safe(ts)}</td></tr>
        </table>
        <div style="margin-top:24px;padding:16px;background:#fce4f3;border-radius:10px;color:#7a0858;font-size:14px;line-height:1.7;">
          관리자 화면에서 입금 확인 후 <b>승인</b> 처리해 주세요.<br>
          승인하시면 응시자에게 자동으로 안내 이메일이 발송됩니다.
          <br><br>
          <a href="https://personalcolor-exam.vercel.app/" style="display:inline-block;background:linear-gradient(135deg,#E91E8C,#9c0062);color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;">
            관리자 화면 열기 →
          </a>
        </div>
        <p style="margin-top:30px;font-size:11px;color:#aaa;text-align:center;">
          K-BEAUTY 퍼스널컬러 스타일리스트 자격시험 · PBS컬러랩 · 1600-7218
        </p>
      </div>
    `;
    text = [
      '새 응시자 접수',
      '',
      `이름: ${name || '-'}`,
      `연락처: ${phone || '-'}`,
      `이메일: ${email || '-'}`,
      `기관: ${inst || '개인'}`,
      `결제수단: ${pay_method === 'card' ? '카드' : '현금'}`,
      `접수시각: ${ts}`,
      '',
      '관리자 화면에서 입금 확인 후 승인 처리해 주세요.',
      'https://personalcolor-exam.vercel.app/'
    ].join('\n');
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.naver.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"PBS컬러랩 자격시험" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });

    return res.status(200).json({ ok: true, to });
  } catch (e) {
    console.error('mail send error:', e);
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

function escapeHtml(s) {
  return String(s ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
