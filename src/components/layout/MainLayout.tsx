import Header from './Header';
import Sidebar from './Sidebar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='drawer lg:drawer-open'>
      <input
        id='drawer-toggle'
        type='checkbox'
        className='drawer-toggle'
      />
      <div className='drawer-content flex flex-col'>
        <Header />
        <main className='flex-1 p-6 bg-base-100'>{children}</main>
      </div>
      <div className='drawer-side'>
        <label
          htmlFor='drawer-toggle'
          className='drawer-overlay'></label>
        <Sidebar />
      </div>
    </div>
  );
}
