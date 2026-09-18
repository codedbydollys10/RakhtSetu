# Sound Files

This directory contains audio files for notification alerts and messaging.

## Required Files

### 1. notification.mp3
- **Purpose**: Normal notification sound
- **Duration**: 1-2 seconds
- **Style**: Gentle, pleasant chime or bell
- **Volume**: Moderate
- **Format**: MP3, optimized for web (< 50KB)

### 2. urgent.mp3
- **Purpose**: Urgent/critical notification sound
- **Duration**: 2-3 seconds
- **Style**: Attention-grabbing alert tone
- **Volume**: Louder than normal notification
- **Format**: MP3, optimized for web (< 50KB)

### 3. message-send.wav
- **Purpose**: Message sent sound (shuttle effect)
- **Duration**: 150ms
- **Style**: Quick ascending swoosh (600Hz → 1200Hz)
- **Volume**: Moderate (50%)
- **Format**: WAV, optimized for web (< 20KB)

### 4. message-receive.wav
- **Purpose**: Message received sound (shuttle effect)
- **Duration**: 200ms
- **Style**: Gentle descending tone (800Hz → 400Hz)
- **Volume**: Moderate (50%)
- **Format**: WAV, optimized for web (< 20KB)

## Generating Sound Files

### For Notification Sounds

#### Option 1: Use Online Tools
- [Zapsplat](https://www.zapsplat.com/) - Free sound effects
- [Freesound](https://freesound.org/) - Community sound library
- [Soundsnap](https://www.soundsnap.com/) - Professional sound effects

#### Option 2: Generate with Code
You can generate simple notification sounds using Web Audio API or tools like:
- Audacity (Free audio editor)
- GarageBand (macOS)
- FL Studio

#### Option 3: Placeholder (Testing)
For testing purposes, you can use any short audio file or create silence:

```bash
# Create a 1-second silence MP3 (requires ffmpeg)
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 -acodec libmp3lame notification.mp3
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 2 -q:a 9 -acodec libmp3lame urgent.mp3
```

### For Message Sounds

#### Option 1: Use the Web-Based Generator (Recommended)
Open `generate-message-sounds.html` in your browser to generate and download the message sounds:
1. Open the file in any modern browser
2. Click "Play" to preview the sounds
3. Click "Download" to get the WAV files
4. Replace the placeholder files in this directory

#### Option 2: Use Online Tools
Search for "whoosh" or "shuttle" sound effects on free sound libraries:
- Short ascending swoosh for send
- Short descending pop for receive

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Requires user interaction before first play
- **Mobile browsers**: May require explicit user permission

## Usage in Code

### Notification Sounds
The notification sound files are played via the `useNotifications` hook:

```typescript
const { playSound } = useNotifications();

// Play normal notification sound
playSound(false);

// Play urgent notification sound
playSound(true);
```

### Message Sounds
The message sound files are played via the `useMessageSounds` hook:

```typescript
const { playSendSound, playReceiveSound } = useMessageSounds();

// Play send sound when message is sent
playSendSound();

// Play receive sound when message is received
playReceiveSound();
```

## Testing

### Notification Sounds
To test notification sounds:
1. Go to Settings → Notifications
2. Enable "Enable Sounds"
3. Click "Test Normal Sound" or "Test Urgent Sound"

### Message Sounds
To test message sounds:
1. Go to the Messages page
2. Send a message (you'll hear the send sound)
3. Receive a message from another user (you'll hear the receive sound)
4. Or open `generate-message-sounds.html` to preview the sounds

## Notes

- Ensure files are optimized for web delivery
- Keep file sizes under 50KB for fast loading
- Use appropriate bitrate (128kbps recommended)
- Test across different browsers and devices
- Consider user's quiet hours preferences
