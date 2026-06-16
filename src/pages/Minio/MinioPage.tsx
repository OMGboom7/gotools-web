import { useState, useEffect, useCallback } from 'react';
import * as minio from '../../api/minio';
import type { BucketItem, ObjectItem } from '../../api/minio';

const BUCKET_MGMT = 'buckets' as const;
const BUCKET_DETAIL = 'objects' as const;
type Tab = typeof BUCKET_MGMT | typeof BUCKET_DETAIL;

export default function MinioPage() {
  // ── state ──
  const [tab, setTab] = useState<Tab>(BUCKET_MGMT);
  const [buckets, setBuckets] = useState<BucketItem[]>([]);
  const [bucket, setBucket] = useState('');
  const [bucketExists, setBucketExists] = useState<boolean | null>(null);
  const [objects, setObjects] = useState<ObjectItem[]>([]);
  const [prefix, setPrefix] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  }, []);

  // ── 后端健康检查 ──
  useEffect(() => {
    minio.healthCheck()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  // ── 列出桶 ──
  const loadBuckets = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await minio.listBuckets();
      setBuckets(data.buckets || []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      showError('获取桶列表失败: ' + (err.response?.data?.error || err.message || ''));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { loadBuckets(); }, [loadBuckets]);

  // ── 创建桶 ──
  const handleCreateBucket = async () => {
    const name = prompt('输入桶名称:');
    if (!name) return;
    try {
      await minio.createBucket(name);
      showError('');
      await loadBuckets();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      showError('创建桶失败: ' + (err.response?.data?.error || err.message || ''));
    }
  };

  // ── 查桶是否存在（HEAD） ──
  const handleCheckBucket = async (name: string) => {
    try {
      await minio.bucketExists(name);
      setBucketExists(true);
      alert(`桶「${name}」存在`);
    } catch {
      setBucketExists(false);
      alert(`桶「${name}」不存在`);
    }
  };

  // ── 删除桶 ──
  const handleDeleteBucket = async (name: string) => {
    if (!confirm(`确定删除桶「${name}」？此操作不可恢复！`)) return;
    try {
      await minio.deleteBucket(name);
      await loadBuckets();
      if (bucket === name) { setBucket(''); setObjects([]); setBucketExists(null); setTab(BUCKET_MGMT); }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      showError('删除桶失败: ' + (err.response?.data?.error || err.message || ''));
    }
  };

  // ── 进入桶 ──
  const enterBucket = (name: string) => {
    setBucket(name);
    setPrefix('');
    setBucketExists(null);
    setTab(BUCKET_DETAIL);
    // 查桶是否存在（不阻塞）
    minio.bucketExists(name).then(() => setBucketExists(true)).catch(() => setBucketExists(false));
    loadObjects(name);
  };

  // ── 列出对象 ──
  const loadObjects = async (name?: string, pfx?: string) => {
    const b = name || bucket;
    const p = pfx !== undefined ? pfx : prefix;
    if (!b) return;
    setLoading(true);
    try {
      const { data } = await minio.listObjects(b, p);
      setObjects(data.objects || []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      showError('获取对象列表失败: ' + (err.response?.data?.error || err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handlePrefixSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadObjects(bucket, prefix);
  };

  // ── 上传对象 ──
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await minio.uploadObject(bucket, file.name, file);
      showError('');
      await loadObjects(bucket, prefix);
    } catch (err: unknown) {
      const e2 = err as { response?: { data?: { error?: string } }; message?: string };
      showError('上传失败: ' + (e2.response?.data?.error || e2.message || ''));
    }
    e.target.value = '';
  };

  // ── 下载对象 ──
  const handleDownload = (key: string) => {
    window.open(minio.getDownloadUrl(bucket, key), '_blank');
  };

  // ── 复制预签名 URL ──
  const handlePresigned = async (key: string, expiry = 3600) => {
    try {
      const { data } = await minio.getPresignedUrl(bucket, key, expiry);
      await navigator.clipboard.writeText(data.presigned_url);
      showError('');
      alert('✅ 预签名 URL 已复制到剪贴板');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      showError('获取预签名 URL 失败: ' + (err.response?.data?.error || err.message || ''));
    }
  };

  // ── 删除对象 ──
  const handleDeleteObject = async (key: string) => {
    if (!confirm(`确定删除「${key}」？`)) return;
    try {
      await minio.deleteObject(bucket, key);
      await loadObjects(bucket, prefix);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      showError('删除对象失败: ' + (err.response?.data?.error || err.message || ''));
    }
  };

  // ── 返回桶列表 ──
  const backToBuckets = () => {
    setBucket('');
    setObjects([]);
    setBucketExists(null);
    setTab(BUCKET_MGMT);
  };

  // ── 清除所有对象（清空桶） ──
  const handleClearBucket = async () => {
    if (!confirm(`确定清空调桶「${bucket}」的所有对象？`)) return;
    try {
      for (const obj of objects) {
        await minio.deleteObject(bucket, obj.key);
      }
      await loadObjects(bucket, prefix);
      showError('');
      alert('✅ 桶已清空');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      showError('清空桶失败: ' + (err.response?.data?.error || err.message || ''));
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      {/* ── 标题栏 ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>🛠️ MinIO 对象存储管理</h1>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 12, fontSize: 13,
          background: backendOk === true ? '#e6ffed' : backendOk === false ? '#ffe6e6' : '#f0f0f0',
          color: backendOk === true ? '#1a7f37' : backendOk === false ? '#c00' : '#999',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
            background: backendOk === true ? '#1a7f37' : backendOk === false ? '#c00' : '#999' }} />
          {backendOk === true ? '后端已连接' : backendOk === false ? '后端断开' : '检测中...'}
        </span>
      </div>

      {error && (
        <div style={{ background: '#fff0f0', color: '#c00', padding: '8px 14px', borderRadius: 6, marginBottom: 12, border: '1px solid #ffd4d4', fontSize: 14 }}>
          ❌ {error}
        </div>
      )}

      {/* ════════════════════ 桶管理 ════════════════════ */}
      {tab === BUCKET_MGMT && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleCreateBucket} style={btnPrimary}>＋ 创建桶</button>
            <button onClick={loadBuckets} style={btnStyle}>🔄 刷新</button>
          </div>

          {loading && <p style={{ color: '#999' }}>加载中...</p>}

          {!loading && buckets.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p>暂无桶，点击「创建桶」开始</p>
            </div>
          )}

          {buckets.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                  <th style={thStyle}>桶名称</th>
                  <th style={thStyle}>创建时间</th>
                  <th style={thStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {buckets.map((b, i) => (
                  <tr key={b.name} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={tdStyle}>
                      <a href="#" onClick={(e) => { e.preventDefault(); enterBucket(b.name); }} style={{ fontWeight: 500 }}>
                        📂 {b.name}
                      </a>
                    </td>
                    <td style={{ ...tdStyle, color: '#888', fontSize: 13 }}>{b.creation_date || '-'}</td>
                    <td style={tdStyle}>
                      <button onClick={() => enterBucket(b.name)} style={smBtn}>📂 浏览对象</button>
                      <button onClick={() => handleCheckBucket(b.name)} style={smBtn}>🔍 检查</button>
                      <button onClick={() => handleDeleteBucket(b.name)} style={{ ...smBtn, color: '#c00' }}>🗑 删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: 24, padding: 16, background: '#f8f9fa', borderRadius: 8, fontSize: 13, color: '#666' }}>
            <strong>接口说明</strong>
            <ul style={{ margin: '8px 0 0 16px', lineHeight: 1.8 }}>
              <li><code>GET /api/v1/</code> — 列出所有桶</li>
              <li><code>PUT /api/v1/&#123;bucket&#125;</code> — 创建桶（幂等）</li>
              <li><code>HEAD /api/v1/&#123;bucket&#125;</code> — 查桶是否存在</li>
              <li><code>DELETE /api/v1/&#123;bucket&#125;</code> — 删除桶</li>
            </ul>
          </div>
        </>
      )}

      {/* ════════════════════ 对象管理 ════════════════════ */}
      {tab === BUCKET_DETAIL && (
        <>
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={backToBuckets} style={btnStyle}>← 返回</button>
            <span style={{ fontWeight: 600, fontSize: 16 }}>📦 {bucket}</span>
            {bucketExists === true && <span style={{ color: '#1a7f37', fontSize: 13 }}>● 已存在</span>}
            {bucketExists === false && <span style={{ color: '#c00', fontSize: 13 }}>● 不存在</span>}
          </div>

          {/* 工具栏 */}
          <div style={{ marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <form onSubmit={handlePrefixSearch} style={{ display: 'flex', gap: 6 }}>
              <input
                placeholder="按前缀过滤对象..."
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                style={{ padding: '7px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: 14, width: 200 }}
              />
              <button type="submit" style={btnStyle}>🔍 搜索</button>
            </form>

            <label style={{ ...btnPrimary, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              📤 上传文件
              <input type="file" hidden onChange={handleUpload} />
            </label>

            <button onClick={() => loadObjects(bucket, prefix)} style={btnStyle}>🔄 刷新</button>

            {objects.length > 0 && (
              <button onClick={handleClearBucket} style={{ ...btnStyle, color: '#c00' }}>🗑 清空桶</button>
            )}
          </div>

          {loading && <p style={{ color: '#999' }}>加载中...</p>}

          {!loading && objects.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
              <p>暂无对象，拖放文件或点击「上传文件」</p>
              {prefix && <p style={{ fontSize: 13 }}>当前有前缀过滤: <code>{prefix}</code></p>}
            </div>
          )}

          {objects.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
                  <th style={thStyle}>对象名</th>
                  <th style={thStyle}>大小</th>
                  <th style={thStyle}>类型</th>
                  <th style={thStyle}>ETag</th>
                  <th style={thStyle}>修改时间</th>
                  <th style={thStyle}>操作</th>
                </tr>
              </thead>
              <tbody>
                {objects.map((o, i) => (
                  <tr key={o.key} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...tdStyle, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.key}>
                      {o.key}
                    </td>
                    <td style={tdStyle}>{fmtSize(o.size)}</td>
                    <td style={{ ...tdStyle, fontSize: 13, color: '#666' }}>{o.content_type || '-'}</td>
                    <td style={{ ...tdStyle, fontSize: 12, color: '#999', fontFamily: 'monospace' }}>{o.etag?.slice(0, 12)}…</td>
                    <td style={{ ...tdStyle, fontSize: 13, color: '#666' }}>{o.last_modified?.replace('T', ' ').slice(0, 19) || '-'}</td>
                    <td style={tdStyle}>
                      <button onClick={() => handleDownload(o.key)} style={smBtn}>⬇ 下载</button>
                      <button onClick={() => handlePresigned(o.key)} style={smBtn}>🔗 分享</button>
                      <button onClick={() => handleDeleteObject(o.key)} style={{ ...smBtn, color: '#c00' }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: 24, padding: 16, background: '#f8f9fa', borderRadius: 8, fontSize: 13, color: '#666' }}>
            <strong>接口说明</strong>
            <ul style={{ margin: '8px 0 0 16px', lineHeight: 1.8 }}>
              <li><code>GET /api/v1/&#123;bucket&#125;?prefix=</code> — 列出对象</li>
              <li><code>PUT /api/v1/&#123;bucket&#125;/&#123;key&#125;</code> — 上传对象（multipart/form-data）</li>
              <li><code>GET /api/v1/&#123;bucket&#125;/&#123;key&#125;</code> — 下载对象</li>
              <li><code>GET /api/v1/&#123;bucket&#125;/&#123;key&#125;?presigned=true&amp;expiry=3600</code> — 预签名 URL</li>
              <li><code>DELETE /api/v1/&#123;bucket&#125;/&#123;key&#125;</code> — 删除对象</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function fmtSize(bytes: number): string {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let s = bytes;
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

const btnBase: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 6, border: '1px solid #ccc',
  background: '#fff', cursor: 'pointer', fontSize: 14, outline: 'none',
};

const btnStyle: React.CSSProperties = { ...btnBase };
const btnPrimary: React.CSSProperties = {
  ...btnBase, background: '#1677ff', color: '#fff', border: '1px solid #1677ff',
};

const smBtn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 4, border: '1px solid #ddd',
  background: '#fff', cursor: 'pointer', fontSize: 13, marginRight: 4, outline: 'none',
};

const thStyle: React.CSSProperties = { padding: '10px 12px', fontWeight: 600, fontSize: 14 };
const tdStyle: React.CSSProperties = { padding: '10px 12px', fontSize: 14 };
