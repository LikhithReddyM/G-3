import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Speech service using ElevenLabs API
 * Handles text-to-speech conversion
 */

let client = null;

function getElevenLabsClient() {
  if (!client) {
    // Try different possible env variable names
    // User specified: xpi-api-key in .env (note: hyphens in env vars need special handling)
    let apiKey = process.env.ELEVENLABS_API_KEY || 
                 process.env.XPI_API_KEY || 
                 process.env.ELEVENLABS_KEY;
    
    // Try accessing with bracket notation for hyphenated names
    if (!apiKey) {
      // dotenv should parse xpi-api-key, but we need to access it correctly
      // In .env: xpi-api-key=value becomes process.env['xpi-api-key']
      apiKey = process.env['xpi-api-key'] || 
               process.env['XPI-API-KEY'] ||
               process.env['ELEVENLABS_API_KEY'];
    }
    
    // Debug: log available env vars (without values) to help diagnose
    if (!apiKey) {
      const envKeys = Object.keys(process.env).filter(key => 
        key.toLowerCase().includes('eleven') || 
        key.toLowerCase().includes('xpi') ||
        (key.toLowerCase().includes('api') && key.toLowerCase().includes('key'))
      );
      
      if (envKeys.length > 0) {
        console.warn('Found API-related env vars:', envKeys.join(', '));
        console.warn('But none matched the expected names: xpi-api-key, ELEVENLABS_API_KEY, XPI_API_KEY');
      }
      
      console.error('\n❌ ElevenLabs API key not found!');
      console.error('📝 To fix this, add one of these to your .env file:');
      console.error('   xpi-api-key=your_actual_api_key_here');
      console.error('   OR');
      console.error('   ELEVENLABS_API_KEY=your_actual_api_key_here');
      console.error('\n⚠️  Make sure:');
      console.error('   - No angle brackets (< >) around the key');
      console.error('   - No quotes around the value');
      console.error('   - The .env file is in the project root directory');
      console.error('   - You restart the server after adding the key\n');
      
      throw new Error('ElevenLabs API key not configured. Please add xpi-api-key=your_key to .env file');
    }
    
    client = new ElevenLabsClient({
      apiKey: apiKey
    });
  }
  return client;
}

/**
 * Convert text to speech using ElevenLabs
 * @param {string} text - Text to convert to speech
 * @param {Object} options - Options for TTS (voice_id, model_id, etc.)
 * @returns {Promise<Buffer>} - Audio buffer
 */
export async function textToSpeech(text, options = {}) {
  try {
    // Check if API key is available first
    try {
      const elevenLabsClient = getElevenLabsClient();
      
      // Default voice ID (Rachel - a popular voice)
      // You can change this or make it configurable
      const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
      
      // Default model
      const modelId = options.modelId || 'eleven_multilingual_v2';
      
      // Generate speech
      const audio = await elevenLabsClient.textToSpeech.convert(voiceId, {
        text: text,
        model_id: modelId,
        voice_settings: {
          stability: options.stability || 0.5,
          similarity_boost: options.similarityBoost || 0.75,
          style: options.style || 0.0,
          use_speaker_boost: options.useSpeakerBoost !== false
        }
      });
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of audio) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (apiKeyError) {
      // If API key is missing, return null instead of throwing
      // This allows the app to continue without TTS
      if (apiKeyError.message.includes('not found') || apiKeyError.message.includes('API key')) {
        console.warn('ElevenLabs TTS disabled: API key not configured');
        return null;
      }
      throw apiKeyError;
    }
  } catch (error) {
    console.error('Error in text-to-speech:', error.message);
    throw error;
  }
}

/**
 * Get available voices from ElevenLabs
 * @returns {Promise<Array>} - List of available voices
 */
export async function getVoices() {
  try {
    const elevenLabsClient = getElevenLabsClient();
    const voices = await elevenLabsClient.voices.getAll();
    return voices.voices || [];
  } catch (error) {
    console.error('Error getting voices:', error);
    throw error;
  }
}

/**
 * Get a specific voice by ID
 * @param {string} voiceId - Voice ID
 * @returns {Promise<Object>} - Voice details
 */
export async function getVoice(voiceId) {
  try {
    const elevenLabsClient = getElevenLabsClient();
    const voice = await elevenLabsClient.voices.get(voiceId);
    return voice;
  } catch (error) {
    console.error('Error getting voice:', error);
    throw error;
  }
}

