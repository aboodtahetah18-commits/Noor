import { ActionDialog } from '@/components/overlays/action-dialog';
import { updateBudgetCategoryAction, deactivateBudgetCategoryAction, createBudgetCategoryAction } from './actions';

type BudgetCategoryRow = {
  id:string;
  name:string;
  categoryGroup:string;
  isActive:boolean;
  isEssential:boolean;
  expenseNatureDefault:string|null;
};

const group:Record<string,string>={OBLIGATION:'التزامات',ESSENTIAL:'احتياجات أساسية',SAVING:'ادخار',EMERGENCY:'طوارئ',GOAL:'أهداف',FLEXIBLE:'مرن'};

function CategoryForm({item}:{item?:BudgetCategoryRow}){
  const action=item?updateBudgetCategoryAction.bind(null,item.id):createBudgetCategoryAction;
  return <form className="account-form form-grid" action={action}>
    <label>اسم البند<input name="name" defaultValue={item?.name??''} required/></label>
    <label>المجموعة<select name="categoryGroup" defaultValue={item?.categoryGroup??'ESSENTIAL'}><option value="OBLIGATION">التزامات</option><option value="ESSENTIAL">احتياجات أساسية</option><option value="SAVING">ادخار</option><option value="EMERGENCY">طوارئ</option><option value="GOAL">أهداف</option><option value="FLEXIBLE">مرن</option></select></label>
    <label>طبيعة المصروف الافتراضية<select name="expenseNatureDefault" defaultValue={item?.expenseNatureDefault??''}><option value="">بدون قيمة افتراضية</option><option value="NECESSARY">ضروري</option><option value="IMPORTANT">مهم</option><option value="OPTIONAL">اختياري</option><option value="ENTERTAINMENT">ترفيهي</option></select></label>
    <label><input type="checkbox" name="isEssential" defaultChecked={item?.isEssential??false}/> بند أساسي</label>
    <button className="primary-button" type="submit">{item?'حفظ التعديلات':'حفظ البند'}</button>
  </form>;
}

export function BudgetCategoriesWide({items}:{items:BudgetCategoryRow[]}){
  return <section className="p47-resource-card namaa-wide-only namaa-collection-card">
    <div className="namaa-collection-head">
      <div><span>البيانات المتكررة</span><h2>بنود الميزانية</h2><small>أضف البنود واحدًا تلو الآخر؛ كل بند يظهر كسطر مستقل مع تعديل وتعطيل من نفس الجدول.</small></div>
      <ActionDialog title="إضافة بند ميزانية" description="أدخل البيانات ثم أكّد الحفظ ليظهر البند مباشرة في الجدول." size="xl" triggerClassName="primary-link" trigger="إضافة بند"><CategoryForm/></ActionDialog>
    </div>
    {items.length===0?<div className="p47-empty-state"><strong>لا توجد بنود بعد</strong><span>أضف أول بند ليظهر هنا.</span></div>:<div className="namaa-table-wrap"><table className="namaa-data-table">
      <thead><tr><th>اسم البند</th><th>المجموعة</th><th>الأساسية</th><th>الطبيعة الافتراضية</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
      <tbody>{items.map(c=><tr key={c.id}>
        <td><strong>{c.name}</strong></td>
        <td>{group[c.categoryGroup]??c.categoryGroup}</td>
        <td>{c.isEssential?'نعم':'لا'}</td>
        <td>{c.expenseNatureDefault??'—'}</td>
        <td><span className={'namaa-table-status '+(c.isActive?'is-active':'is-inactive')}>{c.isActive?'نشط':'معطل'}</span></td>
        <td><div className="p49-resource-actions">
          <ActionDialog title={'تفاصيل '+c.name} size="lg" trigger="التفاصيل"><div className="detail-list"><div><span>المجموعة</span><strong>{group[c.categoryGroup]??c.categoryGroup}</strong></div><div><span>الحالة</span><strong>{c.isActive?'نشط':'معطل'}</strong></div><div><span>الأساسية</span><strong>{c.isEssential?'نعم':'لا'}</strong></div><div><span>الطبيعة الافتراضية</span><strong>{c.expenseNatureDefault??'—'}</strong></div></div></ActionDialog>
          {c.isActive?<ActionDialog title={'تعديل '+c.name} size="xl" trigger="تعديل"><CategoryForm item={c}/></ActionDialog>:null}
          {c.isActive?<ActionDialog title={'تعطيل '+c.name} description="سيبقى السجل التاريخي محفوظًا." size="sm" trigger="تعطيل"><form action={deactivateBudgetCategoryAction.bind(null,c.id)}><button className="danger-button">تأكيد التعطيل</button></form></ActionDialog>:null}
        </div></td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
