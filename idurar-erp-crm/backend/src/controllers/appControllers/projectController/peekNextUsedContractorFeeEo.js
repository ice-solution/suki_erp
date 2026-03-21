const { peekNextUsedContractorFeeEo } = require('@/helpers/usedContractorFeeEoSequence');

/**
 * GET — 回傳下一筆使用判頭費將獲得的 EO 編號（預覽，不佔用序號）
 */
const peekNextUsedContractorFeeEoHandler = async (req, res) => {
  try {
    const nextEoNumber = await peekNextUsedContractorFeeEo();
    return res.status(200).json({
      success: true,
      result: { nextEoNumber },
      message: 'OK',
    });
  } catch (error) {
    console.error('peekNextUsedContractorFeeEo:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: error.message || 'Error reading next EO number',
    });
  }
};

module.exports = peekNextUsedContractorFeeEoHandler;
