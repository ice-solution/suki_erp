const express = require('express');
const path = require('path');

const cors = require('cors');
const compression = require('compression');

const cookieParser = require('cookie-parser');

const coreAuthRouter = require('./routes/coreRoutes/coreAuth');
const coreApiRouter = require('./routes/coreRoutes/coreApi');
const coreDownloadRouter = require('./routes/coreRoutes/coreDownloadRouter');
const corePublicRouter = require('./routes/coreRoutes/corePublicRouter');
const adminAuth = require('./controllers/coreControllers/adminAuth');
const adminRouter = require('./routes/admin');
const contractorRouter = require('./routes/contractor');
const contractorEmployeeRouter = require('./routes/contractorEmployee');
const chartOfAccountsRouter = require('./routes/chartOfAccounts');
const journalEntryRouter = require('./routes/journalEntry');
const financialReportRouter = require('./routes/financialReport');
const accountingRouter = require('./routes/accounting');
const mobileAuthRouter = require('./routes/mobileAuth');
const mobileProjectRouter = require('./routes/mobileProject');

const errorHandlers = require('./handlers/errorHandlers');
const erpApiRouter = require('./routes/appRoutes/appApi');
const inventoryRouter = require('./routes/inventory');

const fileUpload = require('express-fileupload');

// 註冊模型
require('./models/appModels/ContractorEmployee');
require('./models/appModels/Contractor');
require('./models/appModels/Project');
require('./models/appModels/WorkProgress');

// create our Express app
const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      // 允許沒有origin的請求（如移動應用、Postman等）
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        'https://sukierp.ice-solution.hk',
        'https://sukierp-api.ice-solution.hk',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8888',
        'http://localhost:5555'
      ];
      
      // 檢查是否在允許列表中
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // 允許所有 ice-solution.hk 的子域名
        if (origin && origin.endsWith('.ice-solution.hk')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(compression());

// Enable file upload for multipart/form-data
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  parseNested: true,
  useTempFiles: false,
  tempFileDir: '/tmp/',
  uploadTimeout: 60000,
  // Handle Chinese filenames properly
  defCharset: 'utf8',
  defParamCharset: 'utf8'
}));

// Here our API Routes

// Mobile app routes (use mobile authentication)
app.use('/api/mobile-auth', mobileAuthRouter);
app.use('/api/mobile-project', mobileProjectRouter);

app.use('/api', coreAuthRouter);
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/admin', adminRouter);
app.use('/api/contractor', contractorRouter);
app.use('/api/contractor-employee', contractorEmployeeRouter);
app.use('/api/chart-of-accounts', chartOfAccountsRouter);
app.use('/api/journal-entry', journalEntryRouter);
app.use('/api/financial-report', financialReportRouter);
app.use('/api/accounting', accountingRouter);
app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);

// 手機端靜態文件服務
app.use('/mobile', express.static(path.join(__dirname, '../../frontend/mobile')));
app.get('/mobile', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/mobile/index.html'));
});

// 文件上傳靜態服務
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// If that above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

// production error handler
app.use(errorHandlers.productionErrors);

// done! we export it so we can start the site in start.js
module.exports = app;
