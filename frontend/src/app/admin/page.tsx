'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Karaoke, KaraokeCurrentSong, KaraokeFile, KaraokePlaylist, KaraokeSong, KaraokeSongLyrics, KaraokeSongSegment, Karaoke_Solo } from '@/types';
import { getAccessToken } from '@/lib/api';


interface MusicQuizPlaylist {
  id: number;
  name: string;
}

interface MusicQuizTrack {
  id: number;
  title: string;
  fileUrl: string;
}

interface PlaylistTrack {
  playlistId: number;
  trackId: number;
}

interface SegmentFile {
  id: Number,
  file: File,
  position: Number
}

export default function AdminPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  const [MQplaylists, setMQPlaylists] = useState<MusicQuizPlaylist[]>([]);
  const [SOPplaylists, setSOPPlaylists] = useState<Array<{ id: number, name: string }>>([]);
  const [SOPItems, setSOPItems] = useState<Array<{ id: number, title: string, fileUrl: string, position: number }>>([]);
  const [karaokePlaylists, setKaraokePlaylists] = useState<KaraokePlaylist[]>([])
  const [tracks, setTracks] = useState<MusicQuizTrack[]>([]);
  const [selectedPlaylistType, setSelectedPlaylistType] = useState<String | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<number | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [songName, setSongName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [playlistTracks, setPlaylistTracks] = useState<MusicQuizTrack[]>([]);
  const [segmentFiles, setSegmentFiles] = useState<SegmentFile[]>([])
  const [lyricsFile, setLyricsFile] = useState<File | null>(null)



  useEffect(() => {
    if (!loading && (!user || !user.isAdmin)) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchPlaylists();
      fetchTracks();
      fetchKaraokePlaylists();
      fetchSOPPlaylists();
    }
  }, [user]);


  const fetchPlaylists = async () => {
    try {
      const response = await fetch('https://gameapi.katroland.hu/musicquiz/playlists', {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMQPlaylists(data.playlists);
      } else {
        console.error('Failed to fetch playlists');
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };

  const fetchKaraokePlaylists = async () => {
    try {
      const response = await fetch('https://gameapi.katroland.hu/karaoke/playlists', {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setKaraokePlaylists(data.playlists);
      } else {
        console.error('Failed to fetch playlists');
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    }
  };


  const fetchTracks = async () => {
    try {
      const response = await fetch('https://gameapi.katroland.hu/musicquiz/files', {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTracks(data.tracks);
      } else {
        console.error('Failed to fetch tracks');
      }
    } catch (error) {
      console.error('Error fetching tracks:', error);
    }
  };

  const fetchSOPPlaylists = async () => {
    try {
      const response = await fetch('https://gameapi.katroland.hu/sop/playlists', {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSOPPlaylists(data.playlists || []);
      }
    } catch (e) { console.error(e) }
  }

  const fetchSOPItems = async (playlistId: number) => {
    try {
      const response = await fetch(`https://gameapi.katroland.hu/sop/playlists/${playlistId}/items`, {
        headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSOPItems(data.items || []);
      } else { setSOPItems([]) }
    } catch (e) { setSOPItems([]) }
  }

  const createSOPPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const response = await fetch('https://gameapi.katroland.hu/sop/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ name: newPlaylistName })
      });
      if (response.ok) { setNewPlaylistName(''); fetchSOPPlaylists(); }
    } catch (e) { console.error(e); }
  }

  const deleteSOPPlaylist = async (playlistId: number) => {
    if (!confirm('Delete this SOP playlist?')) return;
    try {
      const response = await fetch(`https://gameapi.katroland.hu/sop/playlists/${playlistId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      if (response.ok) { setSOPPlaylists(SOPplaylists.filter(p => p.id !== playlistId)); setSOPItems([]); }
    } catch (e) { console.error(e); }
  }



  const removeSOPItem = async (playlistId: number, itemId: number) => {
    try {
      const response = await fetch(`https://gameapi.katroland.hu/sop/playlists/${playlistId}/items/${itemId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${getAccessToken()}` }
      });
      if (response.ok) { setSOPItems(SOPItems.filter(i => i.id !== itemId)); }
    } catch (e) { console.error(e); }
  }


  useEffect(() => {
    if (selectedPlaylist !== null) {
      fetchPlaylistTracks(selectedPlaylist);
    } else {
      setPlaylistTracks([]);
    }
  }, [selectedPlaylist]);


  const fetchPlaylistTracks = async (playlistId: number) => {
    try {
      const response = await fetch(`https://gameapi.katroland.hu/musicquiz/playlists/${playlistId}/tracks`, {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlaylistTracks(data.tracks);
      } else {
        console.error('Failed to fetch playlist tracks');
        setPlaylistTracks([]);
      }
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      setPlaylistTracks([]);
    }
  };


  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    setIsCreatingPlaylist(true);

    try {
      const response = await fetch('https://gameapi.katroland.hu/musicquiz/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ name: newPlaylistName })
      });

      if (response.ok) {
        setNewPlaylistName('');
        fetchPlaylists();
      } else {
        const error = await response.json();
        console.error('Failed to create playlist:', error);
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const createKaraokePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    setIsCreatingPlaylist(true);

    try {
      const response = await fetch('https://gameapi.katroland.hu/karaoke/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: JSON.stringify({ name: newPlaylistName })
      });

      if (response.ok) {
        setNewPlaylistName('');
        fetchKaraokePlaylists();
      } else {
        const error = await response.json();
        console.error('Failed to create playlist:', error);
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
    } finally {
      setIsCreatingPlaylist(false);
    }
  };


  const deletePlaylist = async (playlistId: number) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;

    try {
      const response = await fetch(`https://gameapi.katroland.hu/musicquiz/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });

      if (response.ok) {
        setMQPlaylists(MQplaylists.filter(p => p.id !== playlistId));
        if (selectedPlaylist === playlistId) {
          setSelectedPlaylist(null);
          setPlaylistTracks([]);
        }
      } else {
        console.error('Failed to delete playlist');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  };

  const handleSegmentFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length == 0) return;

    const temp = [] as SegmentFile[]

    for (let i = 0; i < files.length; i++) {
      let tmp = { id: i, file: files[i], position: i } as SegmentFile
      temp.push(tmp)
    }

    setSegmentFiles(temp);
  }

  const handleLyricsFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    setLyricsFile(event.target.files[0])
  }


  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadMessage('Uploading files...');

    const formData = new FormData();


    for (let i = 0; i < files.length; i++) {
      formData.append('music', files[i]);
    }


    if (selectedPlaylist !== null) {
      formData.append('playlistId', selectedPlaylist.toString());
    }

    try {
      const response = await fetch('https://gameapi.katroland.hu/upload/musicquiz', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data)
        setUploadMessage(`Successfully uploaded ${data.tracks.length} files`);
        fetchTracks();
        if (selectedPlaylist !== null) {
          fetchPlaylistTracks(selectedPlaylist);
        }
        event.target.value = '';
      } else {
        const error = await response.json();
        setUploadMessage(`Upload failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadMessage('Upload failed due to network error');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadMessage(''), 5000);
    }
  };







  const removeTrackFromPlaylist = async (trackId: number) => {
    if (selectedPlaylist === null) return;

    try {
      const response = await fetch(`https://gameapi.katroland.hu/musicquiz/playlists/${selectedPlaylist}/tracks/${trackId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });

      if (response.ok) {
        setPlaylistTracks(playlistTracks.filter(t => t.id !== trackId));
      } else {
        console.error('Failed to remove track from playlist');
      }
    } catch (error) {
      console.error('Error removing track from playlist:', error);
    }
  };

  const removeTrackFromKaraokePlaylist = async (trackId: number) => {
    if (selectedPlaylist === null) return;

    try {
      const response = await fetch(`https://gameapi.katroland.hu/karaoke/playlists/${selectedPlaylist}/tracks/${trackId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });

      if (response.ok) {
        fetchKaraokePlaylists();
      } else {
        console.error('Failed to remove track from playlist');
      }
    } catch (error) {
      console.error('Error removing track from playlist:', error);
    }
  };

  const handleKaraokePlaylistSelect = (id: Number) => {
    setSelectedPlaylist(Number(id))
    setSelectedPlaylistType("karaoke")
  }




  const handlePositionChange = (id: Number, value: Number) => {
    console.log(value)
    console.log(id)
    const segment = segmentFiles.find(f => f.id == id);
    if (!value || !segment || !segment.position) return;
    segment.position = value;
  }

  const handleKaraokeSongUpload = async () => {
    if (!segmentFiles || !lyricsFile) return;

    setIsUploading(true);
    setUploadMessage('Uploading files...');

    const formData = new FormData();


    for (let i = 0; i < segmentFiles.length; i++) {
      formData.append('segment', segmentFiles[i].file);
    }

    let sanitizedSegments = segmentFiles.map(({ file: _, ...rest }) => rest);

    formData.append("segmentData", JSON.stringify(sanitizedSegments))
    formData.append("songName", songName)




    const reader = new FileReader()
    const uploadData = () => {
      return new Promise((resolve, reject) => {
        reader.onload = () => {
          try {
            const result = reader.result as string;
            formData.append('lyricsData', result);
            resolve(null);
          } catch (e) {
            reject(e);
          }
        };
        reader.onerror = reject;
        reader.readAsText(lyricsFile);
      });
    };

    await uploadData();


    reader.readAsText(lyricsFile)


    if (selectedPlaylist !== null) {
      console.log(`playlistid: ${selectedPlaylist}`)
      formData.append('playlistId', selectedPlaylist.toString());
    }




    try {
      const response = await fetch('https://gameapi.katroland.hu/karaoke/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data)
        setUploadMessage(`Successfully uploaded ${data.tracks.length} files`);
        fetchTracks();
        if (selectedPlaylist !== null) {
          fetchPlaylistTracks(selectedPlaylist);
        }


      } else {
        const error = await response.json();
        setUploadMessage(`Upload failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadMessage('Upload failed due to network error');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadMessage(''), 5000);
    }

  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 flex flex-column gap-4">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Music Quiz Playlists</h2>


          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name"
                className="flex-1 px-4 py-2 border rounded-lg"
                disabled={isCreatingPlaylist}
              />
              <button
                onClick={createPlaylist}
                disabled={isCreatingPlaylist || !newPlaylistName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
              >
                {isCreatingPlaylist ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>


          <div className="space-y-2">
            <h3 className="text-lg font-medium mb-2">Available Playlists</h3>
            {MQplaylists.length === 0 ? (
              <p className="text-gray-500">No playlists available</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {MQplaylists.map(playlist => (
                  <li key={playlist.id} className="py-3">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => {
                          setSelectedPlaylist(playlist.id);
                          setSelectedPlaylistType("MQ")
                        }}
                        className={`text-left flex-1 ${selectedPlaylist === playlist.id && selectedPlaylistType == "MQ" ? 'font-bold text-blue-600' : ''}`}
                      >
                        {playlist.name}
                      </button>
                      <button
                        onClick={() => deletePlaylist(playlist.id)}
                        className="ml-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>


        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">
            {selectedPlaylist
              ? `Tracks in ${MQplaylists.find(p => p.id === selectedPlaylist)?.name || 'Playlist'}`
              : 'Upload Tracks'
            }
          </h2>


          <div className="mb-6">
            <div className="flex flex-col gap-2">
              <label className="block text-sm font-medium text-gray-700">
                {selectedPlaylist
                  ? `Upload tracks to ${MQplaylists.find(p => p.id === selectedPlaylist)?.name}`
                  : 'Upload tracks (no playlist selected)'
                }
              </label>
              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
                disabled={isUploading}
              />
              {uploadMessage && (
                <p className={`text-sm ${uploadMessage.includes('Success') ? 'text-green-600' : 'text-red-600'}`}>
                  {uploadMessage}
                </p>
              )}
            </div>
          </div>


          {selectedPlaylist && selectedPlaylistType == "MQ" && (
            <div>
              <h3 className="text-lg font-medium mb-2">Playlist Tracks</h3>
              {playlistTracks.length === 0 ? (
                <p className="text-gray-500">No tracks in this playlist</p>
              ) : (
                <ul className="divide-y divide-gray-200 max-h-72 overflow-y-scroll">
                  {playlistTracks.map(track => (
                    <li key={track.id} className="py-3">
                      <div className="flex justify-between items-center">
                        <span className="flex-1">{track.title}</span>
                        <button
                          onClick={() => removeTrackFromPlaylist(track.id)}
                          className="ml-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Smash or Pass Playlists</h2>
          <div className="mb-6">
            <div className="flex gap-2">
              <input type="text" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} placeholder="New playlist name" className="flex-1 px-4 py-2 border rounded-lg" />
              <button onClick={createSOPPlaylist} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Create</button>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium mb-2">Available SOP Playlists</h3>
            {SOPplaylists.length === 0 ? (
              <p className="text-gray-500">No playlists available</p>
            ) : (
              <ul className="divide-y divide-gray-200 max-h-72 overflow-y-auto">
                {SOPplaylists.map(pl => (
                  <li key={pl.id} className="py-3">
                    <div className="flex justify-between items-center gap-2">
                      <button onClick={() => { setSelectedPlaylist(pl.id); setSelectedPlaylistType('SOP'); fetchSOPItems(pl.id); }} className={`text-left flex-1 ${selectedPlaylist === pl.id && selectedPlaylistType === 'SOP' ? 'font-bold text-blue-600' : ''}`}>{pl.name}</button>
                      <button onClick={() => deleteSOPPlaylist(pl.id)} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">SOP Playlist Items</h2>
          {selectedPlaylist && selectedPlaylistType === 'SOP' ? (
            <div>
              <div className="mb-4 text-sm text-gray-600">Playlist ID: {selectedPlaylist}</div>
              <div className="space-y-2">
                {SOPItems.length === 0 ? (
                  <p className="text-gray-500">No items yet</p>
                ) : (
                  <ul className="divide-y divide-gray-200 max-h-72 overflow-y-auto">
                    {SOPItems.map(item => (
                      <li key={item.id} className="py-3">
                        <div className="flex justify-between items-center gap-2">
                          <span className="flex-1">{item.title}</span>
                          <button onClick={() => removeSOPItem(selectedPlaylist, item.id)} className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">Remove</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-4">
                <SOPAddItemForm playlistId={selectedPlaylist} onAdded={() => fetchSOPItems(selectedPlaylist)} />
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Select a SOP playlist to manage items</div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Karaoke Playlists</h2>


          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="New playlist name"
                className="flex-1 px-4 py-2 border rounded-lg"
                disabled={isCreatingPlaylist}
              />
              <button
                onClick={createKaraokePlaylist}
                disabled={isCreatingPlaylist || !newPlaylistName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
              >
                {isCreatingPlaylist ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>


          <div className="space-y-2">
            <h3 className="text-lg font-medium mb-2">Available Playlists</h3>
            {karaokePlaylists.length === 0 ? (
              <p className="text-gray-500">No playlists available</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {karaokePlaylists.map(playlist => (
                  <li key={`${playlist.id}`} className="py-3">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => handleKaraokePlaylistSelect(playlist.id)}
                        className={`text-left flex-1 ${selectedPlaylist === playlist.id ? 'font-bold text-blue-600' : ''}`}
                      >
                        {playlist.name}
                      </button>
                      <button

                        className="ml-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>


        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">
            {selectedPlaylist
              ? `Tracks in ${karaokePlaylists.find(p => p.id === selectedPlaylist)?.name || 'Playlist'}`
              : 'Upload Tracks'
            }
          </h2>


          <div className="mb-6">
            <div className="flex flex-col gap-2">
              <label className="block text-sm font-medium text-gray-700">
                {selectedPlaylist
                  ? `Upload tracks to ${MQplaylists.find(p => p.id === selectedPlaylist)?.name}`
                  : 'Upload tracks (no playlist selected)'
                }
              </label>
              <input
                type="text"
                accept='application/json'
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
                placeholder="Song Name"
                className="flex-1 px-4 py-2 border rounded-lg"
                disabled={isUploading}
              />

              <input
                type="file"
                accept="audio/*"
                multiple
                onChange={handleSegmentFileSelect}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
                disabled={isUploading}
              />

              <input
                type="file"
                onChange={handleLyricsFileSelect}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
                disabled={isUploading}
              />

              <button
                onClick={handleKaraokeSongUpload}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
              >Uplaod</button>


              {uploadMessage && (
                <p className={`text-sm ${uploadMessage.includes('Success') ? 'text-green-600' : 'text-red-600'}`}>
                  {uploadMessage}
                </p>
              )}
            </div>
          </div>

          <div>
            {segmentFiles && segmentFiles.length > 0 && (
              <ul>
                {segmentFiles.map(f => (
                  <li key={`${f.id}`}>
                    <div className='flex gap-3'>
                      <span className='flex-1'>{f.file.name}</span>
                      <input type="number" defaultValue={`${f.position}`} onChange={(e) => { handlePositionChange(f.id, Number(e.target.value)) }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>


          {selectedPlaylist && (
            <div>
              <h3 className="text-lg font-medium mb-2">Playlist Tracks</h3>
              {karaokePlaylists.find(k => k.id == selectedPlaylist)?.Songs?.length === 0 ? (
                <p className="text-gray-500">No tracks in this playlist</p>
              ) : (
                <ul className="divide-y divide-gray-200 max-h-72 overflow-y-scroll">
                  {karaokePlaylists.find(k => k.id == selectedPlaylist)?.Songs?.map(track => (
                    <li key={track.id} className="py-3">
                      <div className="flex justify-between items-center">
                        <span className="flex-1">{track.title}</span>
                        <button
                          onClick={() => removeTrackFromKaraokePlaylist(track.id)}
                          className="ml-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <Link href="/" className="text-blue-600 hover:underline">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

function SOPAddItemForm({ playlistId, onAdded }: { playlistId: number, onAdded: () => void }) {
  const [title, setTitle] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;

  const doUpload = async () => {
    if (!title.trim() || !file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${base}/sop/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${getAccessToken()}` as any }, body: form, credentials: 'include' });
      if (!res.ok) throw new Error('upload failed');
      const data = await res.json();
      await fetch(`${base}/sop/playlists/${playlistId}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAccessToken()}` }, body: JSON.stringify({ title: title.trim(), fileUrl: data.fileUrl }) });
      setTitle(''); setFile(null); onAdded();
    } finally { setUploading(false); }
  }

  return (
    <div className="space-y-2">
      <input className="w-full px-3 py-2 border rounded" placeholder="Item title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button disabled={uploading || !title || !file} onClick={doUpload} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400">Add Item</button>
    </div>
  )
}
