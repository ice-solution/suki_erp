import useLanguage from '@/locale/useLanguage';
import ReadProjectModule from '@/modules/ProjectModule/ReadProjectModule';

export default function ProjectRead() {
  const translate = useLanguage();

  const entity = 'project';

  const Labels = {
    PANEL_TITLE: translate('project'),
    DATATABLE_TITLE: translate('project_list'),
    ADD_NEW_ENTITY: translate('add_new_project'),
    ENTITY_NAME: translate('project'),
  };

  const configPage = {
    entity,
    ...Labels,
  };
  return <ReadProjectModule config={configPage} />;
}
