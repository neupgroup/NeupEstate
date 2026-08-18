export interface EmiCalculatorInput {
  principal: number
  annualInterestRate: number
  termYears: number
}

export interface YearlyAmortizationRow {
  year: number
  principalPaid: number
  interestPaid: number
  totalPaid: number
  remainingBalance: number
}

export interface EmiCalculatorResult {
  monthlyPayment: number
  totalInterest: number
  totalPayment: number
  yearlySchedule: YearlyAmortizationRow[]
}

const roundToTwo = (value: number) => Math.round(value * 100) / 100

export function calculateEmiBreakdown({
  principal,
  annualInterestRate,
  termYears,
}: EmiCalculatorInput): EmiCalculatorResult {
  if (principal <= 0 || annualInterestRate < 0 || termYears <= 0) {
    return {
      monthlyPayment: 0,
      totalInterest: 0,
      totalPayment: 0,
      yearlySchedule: [],
    }
  }

  const monthlyRate = annualInterestRate / 12 / 100
  const totalMonths = Math.max(1, Math.round(termYears * 12))
  const monthlyPayment =
    monthlyRate === 0
      ? principal / totalMonths
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1)

  let balance = principal
  let yearPrincipalPaid = 0
  let yearInterestPaid = 0
  const yearlySchedule: YearlyAmortizationRow[] = []

  for (let month = 1; month <= totalMonths; month += 1) {
    const interestPaid = monthlyRate === 0 ? 0 : balance * monthlyRate
    const principalPaid = Math.min(monthlyPayment - interestPaid, balance)
    balance = Math.max(0, balance - principalPaid)

    yearPrincipalPaid += principalPaid
    yearInterestPaid += interestPaid

    if (month % 12 === 0 || month === totalMonths) {
      yearlySchedule.push({
        year: Math.ceil(month / 12),
        principalPaid: roundToTwo(yearPrincipalPaid),
        interestPaid: roundToTwo(yearInterestPaid),
        totalPaid: roundToTwo(yearPrincipalPaid + yearInterestPaid),
        remainingBalance: roundToTwo(balance),
      })
      yearPrincipalPaid = 0
      yearInterestPaid = 0
    }
  }

  const totalPayment = monthlyPayment * totalMonths
  const totalInterest = totalPayment - principal

  return {
    monthlyPayment: roundToTwo(monthlyPayment),
    totalInterest: roundToTwo(totalInterest),
    totalPayment: roundToTwo(totalPayment),
    yearlySchedule,
  }
}
