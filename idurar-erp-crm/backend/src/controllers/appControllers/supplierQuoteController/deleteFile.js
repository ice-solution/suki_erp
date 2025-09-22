const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const Model = mongoose.model('SupplierQuote');

const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileId, fileType } = req.body; // fileType: 'dm' or 'invoice'
    
    if (!fileId || !fileType) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'File ID and file type are required',
      });
    }

    // Find the supplier quote
    const supplierQuote = await Model.findById(id);
    
    if (!supplierQuote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Supplier Quote not found',
      });
    }

    let fileToDelete = null;
    let updatedFiles = [];

    // Find and remove the file from the appropriate array
    if (fileType === 'dm') {
      const dmFiles = supplierQuote.dmFiles || [];
      fileToDelete = dmFiles.find(file => file.id === fileId);
      updatedFiles = dmFiles.filter(file => file.id !== fileId);
      
      // Update the document
      await Model.findByIdAndUpdate(id, { dmFiles: updatedFiles });
      
    } else if (fileType === 'invoice') {
      const invoiceFiles = supplierQuote.invoiceFiles || [];
      fileToDelete = invoiceFiles.find(file => file.id === fileId);
      updatedFiles = invoiceFiles.filter(file => file.id !== fileId);
      
      // Update the document
      await Model.findByIdAndUpdate(id, { invoiceFiles: updatedFiles });
    }

    if (!fileToDelete) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'File not found',
      });
    }

    // Delete the physical file
    const filePath = path.join(__dirname, '../../../public', fileToDelete.path);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted file: ${filePath}`);
    }

    return res.status(200).json({
      success: true,
      result: {
        deletedFile: fileToDelete,
        remainingFiles: updatedFiles
      },
      message: 'File deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error deleting file: ' + error.message,
    });
  }
};

module.exports = deleteFile;
