import { google } from 'googleapis';
import { getAuthClient } from '../config/googleAuth.js';

/**
 * YouTube Data API service
 * Access YouTube data including videos, channels, playlists
 */

export async function searchVideos(tokens, query, maxResults = 10) {
  const auth = getAuthClient(tokens);
  const youtube = google.youtube({ version: 'v3', auth });
  
  try {
    const response = await youtube.search.list({
      part: ['snippet'],
      q: query,
      type: 'video',
      maxResults: maxResults,
      order: 'relevance'
    });
    
    const videos = (response.data.items || []).map(item => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails?.default?.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));
    
    return {
      query,
      videos,
      totalResults: response.data.pageInfo?.totalResults || 0
    };
  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    throw error;
  }
}

export async function getVideoDetails(tokens, videoId) {
  const auth = getAuthClient(tokens);
  const youtube = google.youtube({ version: 'v3', auth });
  
  try {
    const response = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [videoId]
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }
    
    const video = response.data.items[0];
    return {
      videoId: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      duration: video.contentDetails.duration,
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount,
      commentCount: video.statistics.commentCount,
      thumbnail: video.snippet.thumbnails?.high?.url,
      url: `https://www.youtube.com/watch?v=${video.id}`
    };
  } catch (error) {
    console.error('Error getting video details:', error);
    throw error;
  }
}

export async function getChannelInfo(tokens, channelId) {
  const auth = getAuthClient(tokens);
  const youtube = google.youtube({ version: 'v3', auth });
  
  try {
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: [channelId]
    });
    
    if (!response.data.items || response.data.items.length === 0) {
      return null;
    }
    
    const channel = response.data.items[0];
    return {
      channelId: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      subscriberCount: channel.statistics.subscriberCount,
      videoCount: channel.statistics.videoCount,
      viewCount: channel.statistics.viewCount,
      thumbnail: channel.snippet.thumbnails?.default?.url,
      url: `https://www.youtube.com/channel/${channel.id}`
    };
  } catch (error) {
    console.error('Error getting channel info:', error);
    throw error;
  }
}

export async function getMyPlaylists(tokens, maxResults = 20) {
  const auth = getAuthClient(tokens);
  const youtube = google.youtube({ version: 'v3', auth });
  
  try {
    const response = await youtube.playlists.list({
      part: ['snippet', 'contentDetails'],
      mine: true,
      maxResults: maxResults
    });
    
    const playlists = (response.data.items || []).map(item => ({
      playlistId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      itemCount: item.contentDetails.itemCount,
      thumbnail: item.snippet.thumbnails?.default?.url,
      url: `https://www.youtube.com/playlist?list=${item.id}`
    }));
    
    return playlists;
  } catch (error) {
    console.error('Error getting playlists:', error);
    throw error;
  }
}

