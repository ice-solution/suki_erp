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
const projectItemRouter = require('./routes/projectItem');
const contractorRouter = require('./routes/contractor');
const contractorEmployeeRouter = require('./routes/contractorEmployee');
const projectRouter = require('./routes/project');
const projectTypePublicRouter = require('./routes/projectTypePublic');
const projectOutboundRouter = require('./routes/projectOutbound');
const projectReturnRouter = require('./routes/projectReturn');
const projectInventoryRouter = require('./routes/projectInventory');
const projectEmployeeRouter = require('./routes/projectEmployee');
const attendanceRouter = require('./routes/attendance');
const workProcessRouter = require('./routes/workProcess');
const workProgressRecordRouter = require('./routes/workProgressRecord');
const chartOfAccountsRouter = require('./routes/chartOfAccounts');
const journalEntryRouter = require('./routes/journalEntry');
const financialReportRouter = require('./routes/financialReport');
const accountingRouter = require('./routes/accounting');
const mobileAuthRouter = require('./routes/mobileAuth');
const mobileProjectRouter = require('./routes/mobileProject');
const mobileAttendanceRouter = require('./routes/mobileAttendance');

const errorHandlers = require('./handlers/errorHandlers');
const erpApiRouter = require('./routes/appRoutes/appApi');
const inventoryRouter = require('./routes/inventory');

const fileUpload = require('express-fileupload');
// create our Express app
const app = express();

app.use(
  cors({
    origin: [
      'https://sukierp.ice-solution.hk',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8888'
    ],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(compression());

// // default options
// app.use(fileUpload());

// Here our API Routes

// Public routes (no authentication required)
app.use('/api/projecttype', projectTypePublicRouter);

// Mobile app routes (use mobile authentication)
app.use('/api/mobile-auth', mobileAuthRouter);
app.use('/api/mobile-project', mobileProjectRouter);
app.use('/api/mobile-attendance', mobileAttendanceRouter);

app.use('/api', coreAuthRouter);
app.use('/api', adminAuth.isValidAuthToken, coreApiRouter);
app.use('/api', adminAuth.isValidAuthToken, erpApiRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/admin', adminRouter);
app.use('/api/project-item', projectItemRouter);
app.use('/api/contractor', contractorRouter);
app.use('/api/contractor-employee', contractorEmployeeRouter);
app.use('/api/project', projectRouter);
app.use('/api/project-outbound', projectOutboundRouter);
app.use('/api/project-return', projectReturnRouter);
app.use('/api/project-inventory', projectInventoryRouter);
app.use('/api/project-employee', projectEmployeeRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/work-process', workProcessRouter);
app.use('/api/work-progress-record', workProgressRecordRouter);
app.use('/api/chart-of-accounts', chartOfAccountsRouter);
app.use('/api/journal-entry', journalEntryRouter);
app.use('/api/financial-report', financialReportRouter);
app.use('/api/accounting', accountingRouter);
app.use('/download', coreDownloadRouter);
app.use('/public', corePublicRouter);

// 手機端靜態文件服務
app.use('/mobile', express.static(path.join(__dirname, '../../frontend/mobile')));

// If that above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

// production error handler
app.use(errorHandlers.productionErrors);

// done! we export it so we can start the site in start.js
module.exports = app;
