/**
 * 總人工 = 日薪 × 打咭工作天數 + 有薪假期（金額）
 */
function getPaidLeaveAmount(salaryOrAmount) {
  if (salaryOrAmount !== null && typeof salaryOrAmount === 'object') {
    const s = salaryOrAmount;
    return Math.max(0, Number(s.paidLeaveAmount ?? s.paidLeaveDays) || 0);
  }
  return Math.max(0, Number(salaryOrAmount) || 0);
}

function computeSalaryTotal(dailySalary, workDays, paidLeaveAmount = 0) {
  const daily = Number(dailySalary) || 0;
  const days = Number(workDays) || 0;
  const leaveAmount = getPaidLeaveAmount(paidLeaveAmount);
  return daily * days + leaveAmount;
}

module.exports = { computeSalaryTotal, getPaidLeaveAmount };
