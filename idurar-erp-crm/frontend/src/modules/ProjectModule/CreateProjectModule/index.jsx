import { ErpLayout } from '@/layout';
import CreateItem from '@/modules/ErpPanelModule/CreateItem';
import ProjectForm from '@/modules/ProjectModule/Forms/ProjectForm';

export default function CreateProjectModule({ config }) {
  return (
    <ErpLayout>
      <CreateItem config={config} CreateForm={ProjectForm} />
    </ErpLayout>
  );
}
