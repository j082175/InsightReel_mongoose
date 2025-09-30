import { Router, Request, Response } from 'express';
import VideoModel from '../models/Video';
import Channel from '../models/Channel';

const router = Router();

/**
 * Simple Admin Panel Routes with CRUD functionality
 * Lightweight alternative to AdminJS with full functionality
 */

// Helper function to escape HTML
const escapeHtml = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Main admin dashboard
router.get('/', async (req: Request, res: Response) => {
  try {
    const videoCount = await VideoModel.countDocuments();
    const channelCount = await Channel.countDocuments();

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InsightReel Admin Panel</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-card h3 { color: #666; font-size: 14px; margin-bottom: 10px; }
    .stat-card .number { font-size: 32px; font-weight: bold; color: #667eea; }
    .nav-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
    .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; transition: all 0.3s; }
    .btn:hover { background: #5568d3; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
    .btn-secondary { background: #48bb78; }
    .btn-secondary:hover { background: #38a169; }
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <h1>🎬 InsightReel Admin Panel</h1>
      <p>비디오 및 채널 관리 시스템</p>
    </div>
  </div>

  <div class="container">
    <div class="stats">
      <div class="stat-card">
        <h3>📹 총 비디오 수</h3>
        <div class="number">${videoCount.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <h3>📺 총 채널 수</h3>
        <div class="number">${channelCount.toLocaleString()}</div>
      </div>
    </div>

    <div class="nav-buttons">
      <a href="/admin/videos" class="btn">📹 비디오 관리</a>
      <a href="/admin/channels" class="btn btn-secondary">📺 채널 관리</a>
    </div>
  </div>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send(`<h1>Error loading admin panel</h1><pre>${error}</pre>`);
  }
});

// Video management page
router.get('/videos', async (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const page = parseInt(req.query.page as string) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const videos = await VideoModel.find()
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalCount = await VideoModel.countDocuments();
    const totalPages = Math.ceil(totalCount / limit);

    const videoRows = videos.map(v => `
      <tr>
        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${v.title || 'N/A'}</td>
        <td><span class="badge badge-${v.platform?.toLowerCase()}">${v.platform || 'N/A'}</span></td>
        <td>${v.channelName || 'N/A'}</td>
        <td>${(v.views || 0).toLocaleString()}</td>
        <td>${(v.likes || 0).toLocaleString()}</td>
        <td>${v.uploadDate ? new Date(v.uploadDate).toLocaleDateString('ko-KR') : 'N/A'}</td>
        <td style="display: flex; gap: 5px;">
          <a href="${v.url}" target="_blank" class="btn-small">보기</a>
          <a href="/admin/videos/${v._id}/edit" class="btn-small btn-edit">편집</a>
          <form method="POST" action="/admin/videos/${v._id}/delete" style="display: inline;" onsubmit="return confirm('정말 삭제하시겠습니까?');">
            <button type="submit" class="btn-small btn-delete">삭제</button>
          </form>
        </td>
      </tr>
    `).join('');

    const pagination = Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1)
      .map(p => `<a href="/admin/videos?page=${p}" class="page-btn ${p === page ? 'active' : ''}">${p}</a>`)
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>비디오 관리 - InsightReel Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .container { max-width: 1600px; margin: 0 auto; padding: 20px; }
    .back-link { color: white; text-decoration: none; display: inline-block; margin-top: 10px; }
    .back-link:hover { text-decoration: underline; }
    .table-container { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f7fafc; font-weight: 600; color: #2d3748; position: sticky; top: 0; }
    tr:hover { background: #f7fafc; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .badge-youtube { background: #ff000015; color: #ff0000; }
    .badge-instagram { background: #e4405f15; color: #e4405f; }
    .badge-tiktok { background: #00000015; color: #000000; }
    .btn-small { padding: 6px 12px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; font-size: 12px; border: none; cursor: pointer; }
    .btn-small:hover { background: #5568d3; }
    .btn-edit { background: #ed8936; }
    .btn-edit:hover { background: #dd6b20; }
    .btn-delete { background: #f56565; }
    .btn-delete:hover { background: #e53e3e; }
    .alert { padding: 15px; margin-bottom: 20px; border-radius: 6px; }
    .alert-success { background: #c6f6d5; color: #22543d; }
    .alert-info { background: #bee3f8; color: #2c5282; }
    .pagination { display: flex; gap: 5px; justify-content: center; padding: 20px; }
    .page-btn { padding: 8px 12px; background: white; border: 1px solid #e2e8f0; text-decoration: none; color: #667eea; border-radius: 4px; }
    .page-btn:hover { background: #f7fafc; }
    .page-btn.active { background: #667eea; color: white; }
    .info { padding: 15px; background: #edf2f7; margin-bottom: 20px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <h1>📹 비디오 관리</h1>
      <a href="/admin" class="back-link">← 대시보드로 돌아가기</a>
    </div>
  </div>

  <div class="container">
    ${req.query.msg === 'updated' ? '<div class="alert alert-success">✅ 비디오가 성공적으로 업데이트되었습니다.</div>' : ''}
    ${req.query.msg === 'deleted' ? '<div class="alert alert-success">🗑️ 비디오가 성공적으로 삭제되었습니다.</div>' : ''}

    <div class="info">
      총 <strong>${totalCount.toLocaleString()}</strong>개의 비디오 | 페이지 <strong>${page}</strong> / <strong>${totalPages}</strong>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>제목</th>
            <th>플랫폼</th>
            <th>채널</th>
            <th>조회수</th>
            <th>좋아요</th>
            <th>업로드 날짜</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          ${videoRows}
        </tbody>
      </table>
    </div>

    <div class="pagination">
      ${page > 1 ? `<a href="/admin/videos?page=${page - 1}" class="page-btn">← 이전</a>` : ''}
      ${pagination}
      ${page < totalPages ? `<a href="/admin/videos?page=${page + 1}" class="page-btn">다음 →</a>` : ''}
    </div>
  </div>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send(`<h1>Error loading videos</h1><pre>${error}</pre>`);
  }
});

// Channel management page
router.get('/channels', async (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    const page = parseInt(req.query.page as string) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const channels = await Channel.find()
      .sort({ subscribers: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalCount = await Channel.countDocuments();
    const totalPages = Math.ceil(totalCount / limit);

    const channelRows = channels.map(c => `
      <tr>
        <td>${c.name || 'N/A'}</td>
        <td><span class="badge badge-${c.platform?.toLowerCase()}">${c.platform || 'N/A'}</span></td>
        <td>${(c.subscribers || 0).toLocaleString()}</td>
        <td>${(c.totalVideos || 0).toLocaleString()}</td>
        <td>${c.categoryInfo?.mainCategory || 'N/A'}</td>
        <td style="display: flex; gap: 5px;">
          <a href="${c.url}" target="_blank" class="btn-small">보기</a>
          <a href="/admin/channels/${c._id}/edit" class="btn-small btn-edit">편집</a>
          <form method="POST" action="/admin/channels/${c._id}/delete" style="display: inline;" onsubmit="return confirm('정말 삭제하시겠습니까?');">
            <button type="submit" class="btn-small btn-delete">삭제</button>
          </form>
        </td>
      </tr>
    `).join('');

    const pagination = Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1)
      .map(p => `<a href="/admin/channels?page=${p}" class="page-btn ${p === page ? 'active' : ''}">${p}</a>`)
      .join('');

    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>채널 관리 - InsightReel Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .back-link { color: white; text-decoration: none; display: inline-block; margin-top: 10px; }
    .back-link:hover { text-decoration: underline; }
    .table-container { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f7fafc; font-weight: 600; color: #2d3748; position: sticky; top: 0; }
    tr:hover { background: #f7fafc; }
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .badge-youtube { background: #ff000015; color: #ff0000; }
    .badge-instagram { background: #e4405f15; color: #e4405f; }
    .badge-tiktok { background: #00000015; color: #000000; }
    .btn-small { padding: 6px 12px; background: #48bb78; color: white; text-decoration: none; border-radius: 4px; font-size: 12px; border: none; cursor: pointer; }
    .btn-small:hover { background: #38a169; }
    .btn-edit { background: #ed8936; }
    .btn-edit:hover { background: #dd6b20; }
    .btn-delete { background: #f56565; }
    .btn-delete:hover { background: #e53e3e; }
    .alert { padding: 15px; margin-bottom: 20px; border-radius: 6px; }
    .alert-success { background: #c6f6d5; color: #22543d; }
    .pagination { display: flex; gap: 5px; justify-content: center; padding: 20px; }
    .page-btn { padding: 8px 12px; background: white; border: 1px solid #e2e8f0; text-decoration: none; color: #48bb78; border-radius: 4px; }
    .page-btn:hover { background: #f7fafc; }
    .page-btn.active { background: #48bb78; color: white; }
    .info { padding: 15px; background: #edf2f7; margin-bottom: 20px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <h1>📺 채널 관리</h1>
      <a href="/admin" class="back-link">← 대시보드로 돌아가기</a>
    </div>
  </div>

  <div class="container">
    ${req.query.msg === 'updated' ? '<div class="alert alert-success">✅ 채널이 성공적으로 업데이트되었습니다.</div>' : ''}
    ${req.query.msg === 'deleted' ? '<div class="alert alert-success">🗑️ 채널이 성공적으로 삭제되었습니다.</div>' : ''}

    <div class="info">
      총 <strong>${totalCount.toLocaleString()}</strong>개의 채널 | 페이지 <strong>${page}</strong> / <strong>${totalPages}</strong>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>채널명</th>
            <th>플랫폼</th>
            <th>구독자</th>
            <th>총 비디오</th>
            <th>카테고리</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          ${channelRows}
        </tbody>
      </table>
    </div>

    <div class="pagination">
      ${page > 1 ? `<a href="/admin/channels?page=${page - 1}" class="page-btn">← 이전</a>` : ''}
      ${pagination}
      ${page < totalPages ? `<a href="/admin/channels?page=${page + 1}" class="page-btn">다음 →</a>` : ''}
    </div>
  </div>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send(`<h1>Error loading channels</h1><pre>${error}</pre>`);
  }
});

// ============================================
// VIDEO CRUD OPERATIONS
// ============================================

// Delete video
router.post('/videos/:id/delete', async (req: Request, res: Response) => {
  try {
    await VideoModel.findByIdAndDelete(req.params.id);
    res.redirect('/admin/videos?msg=deleted');
  } catch (error) {
    res.status(500).send(`<h1>Error deleting video</h1><pre>${error}</pre>`);
  }
});

// Edit video form
router.get('/videos/:id/edit', async (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const video = await VideoModel.findById(req.params.id).lean();

    if (!video) {
      return res.status(404).send('<h1>Video not found</h1>');
    }

    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>비디오 편집 - InsightReel Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .back-link { color: white; text-decoration: none; display: inline-block; margin-top: 10px; }
    .back-link:hover { text-decoration: underline; }
    .form-container { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 30px; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; }
    .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 14px; }
    .form-group textarea { min-height: 100px; resize: vertical; }
    .form-actions { display: flex; gap: 10px; margin-top: 30px; }
    .btn { padding: 12px 24px; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn-primary { background: #667eea; color: white; }
    .btn-primary:hover { background: #5568d3; }
    .btn-secondary { background: #e2e8f0; color: #2d3748; }
    .btn-secondary:hover { background: #cbd5e0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <h1>✏️ 비디오 편집</h1>
      <a href="/admin/videos" class="back-link">← 비디오 목록으로</a>
    </div>
  </div>

  <div class="container">
    <div class="form-container">
      <form method="POST" action="/admin/videos/${video._id}/update">
        <div class="form-group">
          <label>ID</label>
          <input type="text" value="${video._id}" disabled>
        </div>

        <div class="form-group">
          <label>제목</label>
          <input type="text" name="title" value="${escapeHtml(video.title || '')}" required>
        </div>

        <div class="form-group">
          <label>플랫폼</label>
          <select name="platform" required>
            <option value="YOUTUBE" ${video.platform === 'YOUTUBE' ? 'selected' : ''}>YouTube</option>
            <option value="INSTAGRAM" ${video.platform === 'INSTAGRAM' ? 'selected' : ''}>Instagram</option>
            <option value="TIKTOK" ${video.platform === 'TIKTOK' ? 'selected' : ''}>TikTok</option>
          </select>
        </div>

        <div class="form-group">
          <label>채널명</label>
          <input type="text" name="channelName" value="${escapeHtml(video.channelName || '')}">
        </div>

        <div class="form-group">
          <label>URL</label>
          <input type="url" name="url" value="${escapeHtml(video.url || '')}" required>
        </div>

        <div class="form-group">
          <label>썸네일 URL</label>
          <input type="url" name="thumbnailUrl" value="${escapeHtml(video.thumbnailUrl || '')}">
        </div>

        <div class="form-group">
          <label>조회수</label>
          <input type="number" name="views" value="${video.views || 0}">
        </div>

        <div class="form-group">
          <label>좋아요</label>
          <input type="number" name="likes" value="${video.likes || 0}">
        </div>

        <div class="form-group">
          <label>댓글 수</label>
          <input type="number" name="commentsCount" value="${video.commentsCount || 0}">
        </div>

        <div class="form-group">
          <label>메인 카테고리</label>
          <input type="text" name="mainCategory" value="${escapeHtml(video.mainCategory || '')}">
        </div>

        <div class="form-group">
          <label>중간 카테고리</label>
          <input type="text" name="middleCategory" value="${escapeHtml(video.middleCategory || '')}">
        </div>

        <div class="form-group">
          <label>설명</label>
          <textarea name="description">${escapeHtml(video.description || '')}</textarea>
        </div>

        <div class="form-group">
          <label>키워드 (쉼표로 구분)</label>
          <textarea name="keywords" placeholder="예: 요리, 레시피, 음식">${Array.isArray(video.keywords) ? video.keywords.join(', ') : ''}</textarea>
        </div>

        <div class="form-group">
          <label>해시태그 (쉼표로 구분)</label>
          <textarea name="hashtags" placeholder="예: #요리, #레시피, #음식">${Array.isArray(video.hashtags) ? video.hashtags.join(', ') : ''}</textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">💾 저장</button>
          <a href="/admin/videos" class="btn btn-secondary">취소</a>
        </div>
      </form>
    </div>
  </div>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send(`<h1>Error loading video</h1><pre>${error}</pre>`);
  }
});

// Update video
router.post('/videos/:id/update', async (req: Request, res: Response) => {
  try {
    // Parse keywords and hashtags from comma-separated strings
    const keywords = req.body.keywords
      ? req.body.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k)
      : [];

    const hashtags = req.body.hashtags
      ? req.body.hashtags.split(',').map((h: string) => h.trim()).filter((h: string) => h)
      : [];

    const updateData: any = {
      title: req.body.title,
      platform: req.body.platform,
      channelName: req.body.channelName,
      url: req.body.url,
      thumbnailUrl: req.body.thumbnailUrl,
      views: parseInt(req.body.views) || 0,
      likes: parseInt(req.body.likes) || 0,
      commentsCount: parseInt(req.body.commentsCount) || 0,
      mainCategory: req.body.mainCategory,
      middleCategory: req.body.middleCategory,
      description: req.body.description,
      keywords: keywords,
      hashtags: hashtags,
    };

    await VideoModel.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/admin/videos?msg=updated');
  } catch (error) {
    res.status(500).send(`<h1>Error updating video</h1><pre>${error}</pre>`);
  }
});

// ============================================
// CHANNEL CRUD OPERATIONS
// ============================================

// Delete channel
router.post('/channels/:id/delete', async (req: Request, res: Response) => {
  try {
    await Channel.findByIdAndDelete(req.params.id);
    res.redirect('/admin/channels?msg=deleted');
  } catch (error) {
    res.status(500).send(`<h1>Error deleting channel</h1><pre>${error}</pre>`);
  }
});

// Edit channel form
router.get('/channels/:id/edit', async (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const channel = await Channel.findById(req.params.id).lean();

    if (!channel) {
      return res.status(404).send('<h1>Channel not found</h1>');
    }

    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>채널 편집 - InsightReel Admin</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .back-link { color: white; text-decoration: none; display: inline-block; margin-top: 10px; }
    .back-link:hover { text-decoration: underline; }
    .form-container { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 30px; }
    .form-group { margin-bottom: 20px; }
    .form-group label { display: block; margin-bottom: 8px; font-weight: 600; color: #2d3748; }
    .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 14px; }
    .form-actions { display: flex; gap: 10px; margin-top: 30px; }
    .btn { padding: 12px 24px; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn-primary { background: #48bb78; color: white; }
    .btn-primary:hover { background: #38a169; }
    .btn-secondary { background: #e2e8f0; color: #2d3748; }
    .btn-secondary:hover { background: #cbd5e0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <h1>✏️ 채널 편집</h1>
      <a href="/admin/channels" class="back-link">← 채널 목록으로</a>
    </div>
  </div>

  <div class="container">
    <div class="form-container">
      <form method="POST" action="/admin/channels/${channel._id}/update">
        <div class="form-group">
          <label>ID</label>
          <input type="text" value="${channel._id}" disabled>
        </div>

        <div class="form-group">
          <label>채널명</label>
          <input type="text" name="name" value="${escapeHtml(channel.name || '')}" required>
        </div>

        <div class="form-group">
          <label>플랫폼</label>
          <select name="platform" required>
            <option value="YOUTUBE" ${channel.platform === 'YOUTUBE' ? 'selected' : ''}>YouTube</option>
            <option value="INSTAGRAM" ${channel.platform === 'INSTAGRAM' ? 'selected' : ''}>Instagram</option>
            <option value="TIKTOK" ${channel.platform === 'TIKTOK' ? 'selected' : ''}>TikTok</option>
          </select>
        </div>

        <div class="form-group">
          <label>URL</label>
          <input type="url" name="url" value="${escapeHtml(channel.url || '')}" required>
        </div>

        <div class="form-group">
          <label>구독자 수</label>
          <input type="number" name="subscribers" value="${channel.subscribers || 0}">
        </div>

        <div class="form-group">
          <label>총 비디오 수</label>
          <input type="number" name="totalVideos" value="${channel.totalVideos || 0}">
        </div>

        <div class="form-group">
          <label>키워드 (쉼표로 구분)</label>
          <textarea name="keywords" placeholder="예: 게임, 엔터테인먼트, 리뷰">${Array.isArray(channel.keywords) ? channel.keywords.join(', ') : ''}</textarea>
        </div>

        <div class="form-group">
          <label>AI 태그 (쉼표로 구분)</label>
          <textarea name="aiTags" placeholder="예: 인기, 트렌드, 추천">${Array.isArray(channel.aiTags) ? channel.aiTags.join(', ') : ''}</textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">💾 저장</button>
          <a href="/admin/channels" class="btn btn-secondary">취소</a>
        </div>
      </form>
    </div>
  </div>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send(`<h1>Error loading channel</h1><pre>${error}</pre>`);
  }
});

// Update channel
router.post('/channels/:id/update', async (req: Request, res: Response) => {
  try {
    // Parse keywords and aiTags from comma-separated strings
    const keywords = req.body.keywords
      ? req.body.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k)
      : [];

    const aiTags = req.body.aiTags
      ? req.body.aiTags.split(',').map((t: string) => t.trim()).filter((t: string) => t)
      : [];

    const updateData: any = {
      name: req.body.name,
      platform: req.body.platform,
      url: req.body.url,
      subscribers: parseInt(req.body.subscribers) || 0,
      totalVideos: parseInt(req.body.totalVideos) || 0,
      keywords: keywords,
      aiTags: aiTags,
    };

    await Channel.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/admin/channels?msg=updated');
  } catch (error) {
    res.status(500).send(`<h1>Error updating channel</h1><pre>${error}</pre>`);
  }
});

export default router;