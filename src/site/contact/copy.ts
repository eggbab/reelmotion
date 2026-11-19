import type { Lang } from '../../langs'
import type { ContactKind } from './rules'

/**
 * 문의하기 쪽 글. {help}·{privacy} 는 링크로, {email} 은 회사 메일로 바뀐다(ContactPage).
 * 개인정보 안내(보관 3년)는 개인정보처리방침(legal/privacy.ts)과 같아야 한다.
 */
export type ContactCopy = {
  title: string
  description: string
  eyebrow: string
  intro: string
  kind: string
  kinds: Record<ContactKind, string>
  body: string
  bodyHints: Record<ContactKind, string>
  count: string
  email: string
  emailHint: string
  send: string
  sending: string
  privacy: string
  mail: string
  sent: string
  sentReply: string
  sentNoReply: string
  again: string
  errors: { empty: string; tooLong: string; email: string; rate_limited: string; unavailable: string; failed: string }
  trap: string
}

export const CONTACT_COPY: Record<Lang, ContactCopy> = {
  en: {
    title: 'Contact us',
    description: 'Send ReelMotion a question, a bug report, an idea or a question about plans. Leave an email address and we will reply to it.',
    eyebrow: 'SUPPORT',
    intro: 'Tell us what you need or what isn’t working. The answer may already be in {help}.',
    kind: 'What is it about?',
    kinds: { question: 'Question', bug: 'Bug report', idea: 'Idea', billing: 'Plans & billing' },
    body: 'Message',
    bodyHints: {
      question: 'Tell us what you are trying to do.',
      bug: 'Tell us which screen you were on, what you did and what happened, and which device and browser you use (for example, Chrome on Windows or Safari on iPhone). It helps us fix it faster.',
      idea: 'Tell us what you would like to have, or what you would like to work differently.',
      billing: 'Ask about plans or payment. In the reply field, use the email address of the account you sign in with.',
    },
    count: '{n} / {max}',
    email: 'Email for our reply (optional)',
    emailHint: 'We reply to this address. Without one, we can’t reply.',
    send: 'Send',
    sending: 'Sending…',
    privacy: 'We use your message and email address only to answer you and fix what you report, and delete them after 3 years. Details are in the {privacy}.',
    mail: 'You can also email us at {email}.',
    sent: 'Sent. Thank you!',
    sentReply: 'We’ll reply to {email}.',
    sentNoReply: 'You didn’t leave an email address, so we can’t reply. We’ll still read what you sent.',
    again: 'Send another',
    errors: {
      empty: 'Please write your message.',
      tooLong: 'Messages can be up to {max} characters.',
      email: 'Please check the email address.',
      rate_limited: 'Too many messages in a short time. Please try again in about 10 minutes.',
      unavailable: 'Messages can’t be sent from here right now. Please email us at {email}.',
      failed: 'Your message wasn’t sent. Try again in a moment, or email us at {email}.',
    },
    trap: 'Leave this field empty',
  },
  ko: {
    title: '문의하기',
    description: 'ReelMotion에 궁금한 점, 고장, 제안, 요금제 문의를 보내 주세요. 답장 받을 메일을 적으면 그 주소로 답해요.',
    eyebrow: '고객 지원',
    intro: '궁금한 점이나 안 되는 것을 알려 주세요. {help}에 답이 있을 수도 있어요.',
    kind: '어떤 문의인가요?',
    kinds: { question: '질문', bug: '고장 신고', idea: '제안', billing: '요금제·결제' },
    body: '내용',
    bodyHints: {
      question: '무엇을 하려는지 적어 주세요.',
      bug: '어느 화면에서 무엇을 했을 때 어떻게 됐는지, 쓰는 기기와 브라우저(예: 윈도우의 크롬, 아이폰의 사파리)를 적어 주면 더 빨리 고칠 수 있어요.',
      idea: '있었으면 하는 기능이나 바뀌었으면 하는 점을 적어 주세요.',
      billing: '요금제나 결제에 대해 적어 주세요. 답장 받을 메일에는 로그인하는 계정의 메일을 적어 주세요.',
    },
    count: '{n} / {max}자',
    email: '답장 받을 메일 (선택)',
    emailHint: '적으면 이 주소로 답해요. 비워 두면 답장을 보낼 수 없어요.',
    send: '보내기',
    sending: '보내는 중…',
    privacy: '보낸 내용과 메일 주소는 문의에 답하고 알려 주신 문제를 고치는 데만 쓰고, 3년이 지나면 지워요. 자세한 내용은 {privacy}에 있어요.',
    mail: '메일로 보내도 돼요: {email}',
    sent: '보냈어요. 고마워요!',
    sentReply: '답장은 이 주소로 보낼게요: {email}',
    sentNoReply: '답장 받을 메일을 적지 않아서 답장은 보낼 수 없어요. 보내 주신 내용은 잘 읽어 볼게요.',
    again: '하나 더 보내기',
    errors: {
      empty: '내용을 적어 주세요.',
      tooLong: '{max}자까지 적을 수 있어요.',
      email: '메일 주소를 다시 확인해 주세요.',
      rate_limited: '짧은 시간에 너무 많이 보냈어요. 10분쯤 뒤에 다시 보내 주세요.',
      unavailable: '지금은 여기서 보낼 수 없어요. 메일로 보내 주세요: {email}',
      failed: '보내지 못했어요. 잠시 뒤 다시 보내거나 메일로 보내 주세요: {email}',
    },
    trap: '이 칸은 비워 두세요',
  },
  ja: {
    title: 'お問い合わせ',
    description: 'ReelMotion への質問、不具合の報告、提案、プランについてのお問い合わせを送ってください。返信先のメールを書くと、そのアドレスに返信します。',
    eyebrow: 'サポート',
    intro: '分からないことやうまく動かないことを教えてください。{help}に答えがあるかもしれません。',
    kind: 'お問い合わせの種類',
    kinds: { question: '質問', bug: '不具合の報告', idea: '提案', billing: 'プラン・お支払い' },
    body: '内容',
    bodyHints: {
      question: '何をしようとしているかを書いてください。',
      bug: 'どの画面で何をしたときにどうなったか、使っている機器とブラウザ(例: Windows の Chrome、iPhone の Safari)を書いてもらえると早く直せます。',
      idea: 'あったらいい機能や、変わってほしい点を書いてください。',
      billing: 'プランやお支払いについて書いてください。返信先には、ログインしているアカウントのメールを書いてください。',
    },
    count: '{n} / {max}文字',
    email: '返信先のメール(任意)',
    emailHint: '書くとこのアドレスに返信します。空のままだと返信できません。',
    send: '送信',
    sending: '送信中…',
    privacy: '送った内容とメールアドレスは、返信と、知らせていただいた問題を直すためだけに使い、3年たったら削除します。詳しくは{privacy}をご覧ください。',
    mail: 'メールでも送れます: {email}',
    sent: '送信しました。ありがとうございます!',
    sentReply: '{email} に返信します。',
    sentNoReply: '返信先のメールがないため、返信はできません。送っていただいた内容はしっかり読みます。',
    again: 'もう一通送る',
    errors: {
      empty: '内容を書いてください。',
      tooLong: '{max}文字まで書けます。',
      email: 'メールアドレスを確認してください。',
      rate_limited: '短い時間に送りすぎました。10分ほどたってからもう一度送ってください。',
      unavailable: '今はここから送れません。{email} にメールを送ってください。',
      failed: '送れませんでした。少したってからもう一度送るか、{email} にメールを送ってください。',
    },
    trap: 'この欄は空のままにしてください',
  },
}
