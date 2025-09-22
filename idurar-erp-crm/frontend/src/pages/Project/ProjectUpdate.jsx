import UpdateProjectModule from '@/modules/ProjectModule/UpdateProjectModule';

export default function ProjectUpdate() {
  const entity = 'project';
  const Labels = {
    PANEL_TITLE: 'Update Project',
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

  return <UpdateProjectModule config={config} />;
}
