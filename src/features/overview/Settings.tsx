import { useState } from 'react';
import { Button, Card } from '../../ui/kit';
import { updateSettings, useSettings, type Settings as S } from '../../lib/settings';
import { clearAll, IS_DEV_DB, kvGet, kvSet, notifyChange } from '../../lib/storage';
import { download, exportBackup, importBackup, importLegacy } from '../../lib/backup';
import { hasChineseVoice, speak } from '../../lib/tts';
import { RECOGNITION_OK, RECORDING_OK } from '../../lib/speech';
import { useData } from '../../lib/hooks';

const readFile = (f: File) => f.text().then(t => JSON.parse(t));

export default function Settings() {
  const s = useSettings();
  const mock = useData(() => kvGet('mockAi', false));
  const [msg, setMsg] = useState('');
  const [pass, setPass] = useState<string | null>(null);
  if (!s) return null;

  const goal = (k: keyof S['goals'], v: number) => updateSettings({ goals: { ...s.goals, [k]: Math.max(1, v) } });
  const run = async (f: () => Promise<string>) => { try { setMsg(await f()); } catch (e) { setMsg((e as Error).message); } };

  return (
    <>
      {msg && <p className="rounded-xl border border-accent/50 p-3 text-sm">{msg}</p>}
      <Card title="Học từ mới">
        <label className="flex justify-between text-sm" htmlFor="new-per-day"><span>Số từ mới mỗi ngày</span><b>{s.newPerDay}</b></label>
        <input id="new-per-day" type="range" min={5} max={50} step={1} value={s.newPerDay} onChange={e => updateSettings({ newPerDay: Number(e.target.value) })} className="mt-2 w-full accent-[#e3a83b]" />
        <p className="mt-1 text-xs text-muted">Khi số thẻ cần ôn trong ngày vượt {s.reviewCap}, app tự dừng thêm từ mới.</p>
      </Card>

      <Card title="Mục tiêu hằng ngày">
        {([['vocab', 'Ôn từ (thẻ)'], ['write', 'Viết (câu)'], ['speak', 'Nói (câu)'], ['listen', 'Nghe (đoạn)']] as const).map(([k, label]) => (
          <label key={k} className="flex min-h-[44px] items-center justify-between text-sm">
            {label}
            <input type="number" min={1} max={500} value={s.goals[k]} onChange={e => goal(k, Number(e.target.value))}
              className="w-20 rounded-lg border border-line bg-bg px-2 py-1 text-right" />
          </label>
        ))}
      </Card>

      <Card title="AI sửa lỗi">
        <label className="text-sm" htmlFor="passcode">Mật khẩu truy cập (do bạn đặt trên Netlify: APP_PASSCODE)</label>
        <div className="mt-2 flex gap-2">
          <input id="passcode" type="password" autoComplete="off" value={pass ?? s.passcode} onChange={e => setPass(e.target.value)}
            className="min-h-[44px] flex-1 rounded-xl border border-line bg-bg px-3" />
          <Button onClick={async () => { await updateSettings({ passcode: (pass ?? s.passcode).trim() }); setPass(null); setMsg('Đã lưu mật khẩu.'); }}>Lưu</Button>
        </div>
        <label className="mt-3 flex min-h-[44px] items-center gap-3 text-sm">
          <input type="checkbox" checked={!!mock} onChange={async e => { await kvSet('mockAi', e.target.checked); notifyChange(); }} className="h-5 w-5" />
          Chế độ thử: AI trả kết quả mẫu, không tốn lượt gọi
        </label>
        <p className="text-xs text-muted">Chỉ nội dung câu cần sửa được gửi đi; nhật ký luyện tập luôn ở trên máy này.</p>
      </Card>

      <Card title="Kiểm tra thiết bị">
        <ul className="flex flex-col gap-1 text-sm">
          <li>Giọng đọc tiếng Trung: {hasChineseVoice() ? 'có' : 'không tìm thấy (Nghe và Nói mẫu có thể không phát được)'}</li>
          <li>Ghi âm: {RECORDING_OK ? 'có' : 'không'}</li>
          <li>Nhận diện giọng nói: {RECOGNITION_OK ? 'có' : 'không (vẫn tự đánh giá được)'}</li>
        </ul>
        <Button className="mt-2" onClick={() => speak('你好，我们开始练习吧。')}>Thử giọng đọc</Button>
      </Card>

      <Card title="Sao lưu và chuyển máy">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={async () => download(`luyen-tieng-trung-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await exportBackup()))}>Xuất (JSON)</Button>
          <FileButton label="Nhập bản sao lưu" onFile={f => run(async () => {
            if (!confirm('Nhập sẽ THAY THẾ toàn bộ dữ liệu hiện tại trên máy này. Tiếp tục?')) return 'Đã hủy.';
            return importBackup(await readFile(f));
          })} />
        </div>
        <p className="mt-2 text-xs text-muted">Bản xuất gồm cả nhật ký luyện tập, thẻ ôn và câu đã lưu.</p>
      </Card>

      <Card title="Lấy tiến độ từ app cũ">
        <ol className="list-decimal pl-5 text-sm text-muted">
          <li>Mở app cũ (file legacy/index.html bản mới nhất) ở đúng nơi bạn vẫn dùng.</li>
          <li>Bấm nút "Xuất dữ liệu cũ" ở cuối trang để tải file JSON.</li>
          <li>Chọn file đó ở đây. Từ đã thuộc sẽ được hẹn ôn kiểm tra rải đều trong 3 tuần.</li>
        </ol>
        <FileButton className="mt-2 w-full" label="Chọn file dữ liệu cũ" onFile={f => run(async () => importLegacy(await readFile(f)))} />
      </Card>

      <Card title="Xóa dữ liệu">
        <Button className="w-full border-bad/60 text-bad" onClick={() => run(async () => {
          if (!confirm('Xóa TOÀN BỘ dữ liệu (nhật ký, thẻ ôn, câu đã lưu, cài đặt) trên máy này? Không hoàn tác được. Nên xuất bản sao lưu trước.')) return 'Đã hủy.';
          await clearAll(); notifyChange();
          return 'Đã xóa toàn bộ dữ liệu.';
        })}>Xóa toàn bộ dữ liệu{IS_DEV_DB ? ' mẫu' : ''}</Button>
      </Card>
    </>
  );
}

function FileButton({ label, onFile, className = '' }: { label: string; onFile: (f: File) => void; className?: string }) {
  return (
    <label className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-line bg-card px-4 text-center ${className}`}>
      {label}
      <input type="file" accept="application/json,.json" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </label>
  );
}
