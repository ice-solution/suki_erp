import CreateProjectModule from '@/modules/ProjectModule/CreateProjectModule';

export default function ProjectCreate() {
  const entity = 'project';
  const Labels = {
    PANEL_TITLE: 'Create Project',
    DATATABLE_TITLE: 'project list',
    ADD_NEW_ENTITY: 'add new project',
    ENTITY_NAME: 'project',
    CREATE_ENTITY: 'save project',
    UPDATE_ENTITY: 'update project',
  };

  const config = {
    entity,
    ...Labels,
  };

  return <CreateProjectModule config={config} />;
}
