const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const router = express.Router();

const appControllers = require('@/controllers/appControllers');
const { routesList } = require('@/models/utils');

const routerApp = (entity, controller) => {
  // 具體路由必須在參數路由之前
  
  // Add file upload routes for supplierquote FIRST
  if (entity === 'supplierquote') {
    router.route(`/${entity}/create-with-files`).post(catchErrors(controller['create']));
    router.route(`/${entity}/update-with-files/:id`).patch(catchErrors(controller['update']));
    router.route(`/${entity}/delete-file/:id`).delete(catchErrors(controller['deleteFile']));
  }

  router.route(`/${entity}/create`).post(catchErrors(controller['create']));
  router.route(`/${entity}/search`).get(catchErrors(controller['search']));
  router.route(`/${entity}/list`).get(catchErrors(controller['list']));
  router.route(`/${entity}/listAll`).get(catchErrors(controller['listAll']));
  router.route(`/${entity}/filter`).get(catchErrors(controller['filter']));
  router.route(`/${entity}/summary`).get(catchErrors(controller['summary']));

  if (entity === 'invoice' || entity === 'quote' || entity === 'payment') {
    router.route(`/${entity}/mail`).post(catchErrors(controller['mail']));
  }
  
  if (entity === 'invoice') {
    router.route(`/${entity}/linkProject/:id`).patch(catchErrors(controller['linkProject']));
  }

  if (entity === 'quote') {
    router.route(`/${entity}/convert/:id`).get(catchErrors(controller['convert']));
    router.route(`/${entity}/linkProject/:id`).patch(catchErrors(controller['linkProject']));
  }

  if (entity === 'project') {
    router.route(`/${entity}/sync/:id`).patch(catchErrors(controller['sync']));
    router.route(`/${entity}/check/:poNumber`).get(catchErrors(controller['checkByPoNumber']));
    router.route(`/${entity}/check-po-change`).get(catchErrors(controller['checkPoNumberChange']));
    router.route(`/${entity}/:projectId/salary`).post(catchErrors(controller['addSalary']));
    router.route(`/${entity}/:projectId/salary/:salaryId`).patch(catchErrors(controller['updateSalary']));
    router.route(`/${entity}/:projectId/salary/:salaryId`).delete(catchErrors(controller['deleteSalary']));
    router.route(`/${entity}/:projectId/attendance`).get(catchErrors(controller['getAttendance']));
    router.route(`/${entity}/:projectId/attendance`).post(catchErrors(controller['addAttendance']));
    router.route(`/${entity}/:projectId/attendance/:attendanceId`).patch(catchErrors(controller['updateAttendance']));
    router.route(`/${entity}/:projectId/attendance/:attendanceId`).delete(catchErrors(controller['deleteAttendance']));
  }

  if (entity === 'workprogress') {
    router.route(`/${entity}/upload-image`).post(catchErrors(controller['uploadImage']));
  }

  // 參數路由必須在所有具體路由之後
  router.route(`/${entity}/read/:id`).get(catchErrors(controller['read']));
  router.route(`/${entity}/update/:id`).patch(catchErrors(controller['update']));
  router.route(`/${entity}/delete/:id`).delete(catchErrors(controller['delete']));
};

routesList.forEach(({ entity, controllerName }) => {
  const controller = appControllers[controllerName];
  routerApp(entity, controller);
});

module.exports = router;
