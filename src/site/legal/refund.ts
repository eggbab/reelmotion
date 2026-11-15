import { PLANS, formatWon } from '../plans'
import { REFUND_BUSINESS_DAYS as DAYS3, REFUND_EXAMPLE as X, REFUND_PENALTY_PERCENT as FEE, REFUND_WINDOW_DAYS as WINDOW } from './refund-math'
import type { LegalDocs } from './types'

/**
 * 환불 규정. 원문은 한국어이고 영어·일본어는 번역이다. 기준과 계산은 refund-math.ts 가 주인이고, 숫자는 모두 거기서 가져온다.
 * 유료 요금제는 아직 팔지 않으므로 「판매를 시작하면 적용」으로 적는다. 결제 방법이 정해지면 5·6절을 고친다.
 */
const price = (id: 'creator' | 'pro') => formatWon(PLANS.find((plan) => plan.id === id)!.monthlyWon)
const w = formatWon

export const REFUND: LegalDocs = {
  ko: {
    title: '환불 규정',
    description: `ReelMotion 유료 요금제의 환불 기준 — 결제한 날부터 ${WINDOW}일 안에는 전액, 그 뒤에는 쓴 기간과 위약금 ${FEE}%를 빼고 돌려 드립니다.`,
    intro: `유료 요금제는 아직 판매하지 않습니다. 지금은 모든 기능이 무료라 결제와 환불이 없습니다. 판매를 시작하면 아래 기준으로 환불합니다.`,
    sections: [
      { title: '적용 대상', blocks: [`크리에이터(월 ${price('creator')}원)·프로(월 ${price('pro')}원) 요금제 결제에 적용됩니다. 무료 요금제는 결제가 없습니다.`] },
      { title: `결제한 날부터 ${WINDOW}일 안: 전액`, blocks: [`결제한 날부터 ${WINDOW}일 안에 요청하시면 요금제를 쓰셨더라도 결제한 금액을 모두 돌려 드립니다.`] },
      {
        title: `${WINDOW}일이 지난 뒤: 쓴 기간과 위약금 ${FEE}%`,
        blocks: [
          `요금제는 언제든 그만둘 수 있습니다. ${WINDOW}일이 지난 뒤 그만두시면 쓴 기간의 값을 결제한 금액에서 빼고, 남은 금액에서 위약금 ${FEE}%를 빼고 돌려 드립니다.`,
          { formula: ['쓴 날의 값 = 결제한 금액 × 쓴 날 수 ÷ 요금제 전체 날 수', '남은 금액 = 결제한 금액 − 쓴 날의 값', `돌려 드리는 금액 = 남은 금액 − 남은 금액의 ${FEE}%`] },
          '쓴 날은 요금제가 열린 날부터 그만두겠다고 요청하신 날까지입니다. 1원 미만은 버립니다.',
          `예를 들어 크리에이터 1개월(${w(X.paid)}원, ${X.totalDays}일)을 ${X.usedDays}일 쓰고 그만두시면, 쓴 ${X.usedDays}일의 값은 ${w(X.paid)}원 × ${X.usedDays} ÷ ${X.totalDays} = ${w(X.used)}원입니다. 남은 금액 ${w(X.remaining)}원에서 위약금 ${FEE}%인 ${w(X.penalty)}원을 빼고 ${w(X.amount)}원을 돌려 드립니다.`,
        ],
      },
      {
        title: '안내와 다르게 동작했다면: 전액',
        blocks: [
          `ReelMotion이 요금 안내나 이 사이트의 설명과 다르게 동작해 제대로 쓰지 못하셨다면, ${WINDOW}일이 지났더라도 요금제가 열린 날부터 3개월 안, 그 사실을 아셨거나 알 수 있었던 날부터 30일 안에 요청하시면 결제한 금액을 모두 돌려 드립니다. 이때는 쓴 기간과 위약금을 빼지 않습니다.`,
        ],
      },
      { title: '요청하는 방법', blocks: ['{contact} 로 결제한 날과 결제할 때 쓴 이메일 주소를 적어 보내 주세요.'] },
      { title: '돌려 드리는 때', blocks: [`요청을 받은 날부터 ${DAYS3}영업일 안에 결제한 방법으로 돌려 드립니다. 카드로 결제하셨다면 카드사 처리에 며칠이 더 걸릴 수 있습니다.`] },
    ],
  },
  en: {
    title: 'Refund Policy',
    description: `Refunds for ReelMotion paid plans — a full refund within ${WINDOW} days of payment; after that, the used period and a ${FEE}% fee are deducted.`,
    intro: 'Paid plans are not on sale yet. Every feature is free for now, so there is nothing to pay or refund. When paid plans open, these rules apply.',
    sections: [
      { title: 'Which payments this covers', blocks: [`Payments for the Creator (KRW ${price('creator')} a month) and Pro (KRW ${price('pro')} a month) plans. The Free plan has no payment.`] },
      { title: `Within ${WINDOW} days of payment: a full refund`, blocks: [`If you ask within ${WINDOW} days of paying, we refund the full amount, even if you have used the plan.`] },
      {
        title: `After ${WINDOW} days: the used period and a ${FEE}% fee`,
        blocks: [
          `You can stop your plan at any time. If you stop after ${WINDOW} days, we deduct the value of the days used from what you paid, then deduct a ${FEE}% fee from the remainder, and refund the rest.`,
          { formula: ['Value of days used = amount paid × days used ÷ days in the plan', 'Remainder = amount paid − value of days used', `Refund = remainder − ${FEE}% of the remainder`] },
          'Days used run from the day the plan started to the day you ask to stop. Amounts below 1 won are dropped.',
          `For example, if you stop a one-month Creator plan (KRW ${w(X.paid)}, ${X.totalDays} days) after ${X.usedDays} days, the ${X.usedDays} days used are worth KRW ${w(X.paid)} × ${X.usedDays} ÷ ${X.totalDays} = KRW ${w(X.used)}. From the remainder of KRW ${w(X.remaining)} we deduct the ${FEE}% fee of KRW ${w(X.penalty)} and refund KRW ${w(X.amount)}.`,
        ],
      },
      {
        title: 'If it did not work as described: a full refund',
        blocks: [
          `If ReelMotion did not work as the pricing section or this site describes and you could not use it properly, we refund the full amount even after ${WINDOW} days, as long as you ask within 3 months of the plan starting and within 30 days of when you found out or could have found out. In this case nothing is deducted.`,
        ],
      },
      { title: 'How to ask', blocks: ['Write to {contact} with the date you paid and the email address you used to pay.'] },
      { title: 'When you get it back', blocks: [`We refund through the method you paid with, within ${DAYS3} business days of receiving your request. Card refunds can take a few more days at the card company.`] },
    ],
  },
  ja: {
    title: '返金ポリシー',
    description: `ReelMotion 有料プランの返金基準 — お支払いから${WINDOW}日以内は全額、その後は利用期間と違約金${FEE}%を差し引いて返金します。`,
    intro: '有料プランはまだ販売していません。現在はすべての機能が無料のため、支払いと返金はありません。販売を始めたら、以下の基準で返金します。',
    sections: [
      { title: '対象', blocks: [`クリエイター(月${price('creator')}ウォン)・プロ(月${price('pro')}ウォン)プランの支払いが対象です。無料プランには支払いがありません。`] },
      { title: `お支払いから${WINDOW}日以内: 全額`, blocks: [`お支払いから${WINDOW}日以内にお申し出いただければ、プランを使っていても支払った金額をすべて返金します。`] },
      {
        title: `${WINDOW}日を過ぎた後: 利用期間と違約金${FEE}%`,
        blocks: [
          `プランはいつでもやめられます。${WINDOW}日を過ぎてからやめる場合は、利用した期間の金額を支払額から差し引き、残りの金額から違約金${FEE}%を差し引いて返金します。`,
          { formula: ['利用した日の金額 = 支払額 × 利用日数 ÷ プランの全日数', '残りの金額 = 支払額 − 利用した日の金額', `返金額 = 残りの金額 − 残りの金額の${FEE}%`] },
          '利用日数は、プランが始まった日からやめるとお申し出いただいた日までです。1ウォン未満は切り捨てます。',
          `たとえば、クリエイター1か月(${w(X.paid)}ウォン、${X.totalDays}日)を${X.usedDays}日使ってやめる場合、利用した${X.usedDays}日分の金額は ${w(X.paid)}ウォン × ${X.usedDays} ÷ ${X.totalDays} = ${w(X.used)}ウォンです。残りの金額${w(X.remaining)}ウォンから違約金${FEE}%の${w(X.penalty)}ウォンを差し引き、${w(X.amount)}ウォンを返金します。`,
        ],
      },
      {
        title: '案内と違う動作だった場合: 全額',
        blocks: [
          `ReelMotion が料金案内やこのサイトの説明と違う動作をして正しく使えなかった場合は、${WINDOW}日を過ぎていても、プランの開始日から3か月以内、その事実を知った日または知ることができた日から30日以内にお申し出いただければ、支払った金額をすべて返金します。この場合、利用期間と違約金は差し引きません。`,
        ],
      },
      { title: 'お申し出の方法', blocks: ['{contact} まで、支払った日と支払いに使ったメールアドレスをお送りください。'] },
      { title: '返金の時期', blocks: [`お申し出を受けた日から${DAYS3}営業日以内に、お支払いいただいた方法で返金します。カードでお支払いの場合、カード会社の処理にさらに数日かかることがあります。`] },
    ],
  },
}
