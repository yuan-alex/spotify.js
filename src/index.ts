import axios, { Axios, AxiosInstance } from "axios";
import { RequestAccessTokenResponse } from "./types";

interface ClientConfig {
  clientId: string;
  clientSecret?: string;
  accessToken: string;
  refreshToken?: string;
  scope?: string;
  redirectUri: string;
  customAxiosInstance?: any;
  autoRefreshToken?: boolean;
}

export default class SpotifyJS {
  private clientId: string;
  private clientSecret?: string | undefined;
  private accessToken: string;
  private refreshToken?: string;
  private scope?: string;
  private redirectUri?: string;
  private _axiosInstance: AxiosInstance;
  private autoRefreshToken?: boolean;

  private async _makeApiRequest<T>(config: {
    method: string;
    url: string;
    headers?: {
      [key: string]: any;
    };
    params?: {
      [key: string]: any;
    };
    data?: any;
  }): Promise<T> {
    try {
      return (await this._axiosInstance(config)).data;
    } catch (error) {
      return error;
    }
  }

  constructor(config: ClientConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.refreshToken = config.refreshToken;
    this.scope = config.scope;
    this.redirectUri = config.redirectUri;
    this.autoRefreshToken = config.autoRefreshToken;

    this._axiosInstance = config.customAxiosInstance || axios.create();
    this._axiosInstance.defaults.baseURL = "https://api.spotify.com/v1";

    // wait until there is an axios instance before setting token
    this.setAccessToken(config.accessToken);
  }

  public getAccessToken() {
    return this.accessToken;
  }

  public setAccessToken(token: string) {
    this.accessToken = token;
    this._axiosInstance.defaults.headers[
      "Authorization"
    ] = `Bearer ${this.accessToken}`;
  }

  public getRefreshToken() {
    return this.refreshToken;
  }

  public setRefreshToken(token: string) {
    this.refreshToken = token;
  }

  public generateAuthorizeUrl(options?: {
    state?: string;
    scope?: string;
    show_dialog?: boolean;
  }): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
    });
    if (options?.state) {
      params.append("state", options.state);
    }
    if (options?.scope) {
      params.append("scope", options.scope);
    }
    if (options?.show_dialog) {
      params.append("show_dialog", options.show_dialog ? "true" : "false");
    }
    params.sort();
    return `https://accounts.spotify.com/authorize?${params}`;
  }

  public async requestAccessToken({ code }: { code: string }) {
    if (!this.clientSecret)
      throw new Error("Client secret must be set to request access token.");
    try {
      const response = await this._makeApiRequest<RequestAccessTokenResponse>({
        method: "POST",
        url: "https://accounts.spotify.com/api/token",
        headers: {
          Authorization: `Basic ${atob(
            this.clientId + ":" + this.clientSecret
          )}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        data: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: this.redirectUri,
        }).toString(),
      });
      this.setAccessToken(response.access_token);
      this.setRefreshToken(response.refresh_token);
      return response;
    } catch (error) {
      return error;
    }
  }

  public refreshAccessToken() {
    if (!this.clientSecret)
      throw new Error("Client secret must be set to refresh token");
    if (!this.refreshToken) throw new Error("Refresh token is not set");
    return this._makeApiRequest<RequestAccessTokenResponse>({
      method: "POST",
      url: "https://accounts.spotify.com/api/token",
      headers: {
        Authorization: `Basic ${atob(this.clientId + ":" + this.clientSecret)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
      }),
    });
  }

  public getAlbumTracks({
    album_id,
    market,
    limit,
    offset,
  }: {
    album_id: string;
    market?: string;
    limit?: number;
    offset?: number;
  }) {
    return this._makeApiRequest<SpotifyApi.AlbumTracksResponse>({
      method: "GET",
      url: `albums/${album_id}/tracks`,
      params: { market, limit, offset },
    });
  }

  public getAlbum({ album_id, market }: { album_id: string; market?: string }) {
    return this._makeApiRequest<SpotifyApi.SingleAlbumResponse>({
      method: "GET",
      url: `albums/${album_id}`,
      params: { market },
    });
  }

  public getSeveralAlbums({ ids, market }: { ids: string[]; market?: string }) {
    return this._makeApiRequest<SpotifyApi.MultipleAlbumsResponse>({
      method: "GET",
      url: "albums",
      params: {
        ids,
        market,
      },
    });
  }

  public getArtistAlbums({
    artist_id,
    include_groups,
    market,
    limit,
    offset,
  }: {
    artist_id: string;
    include_groups?: string;
    market?: string;
    limit?: number;
    offset?: number;
  }) {
    return this._makeApiRequest<SpotifyApi.ArtistsAlbumsResponse>({
      method: "GET",
      url: `artist/${artist_id}/albums`,
      params: {
        include_groups,
        market,
        limit,
        offset,
      },
    });
  }

  public getArtistsTopTracks({
    artist_id,
    market,
  }: {
    artist_id: string;
    market?: string;
  }) {
    return this._makeApiRequest<SpotifyApi.ArtistsTopTracksResponse>({
      method: "GET",
      url: `artist/${artist_id}/top-tracks`,
      params: { market },
    });
  }

  public getArtist({ artist_id }: { artist_id: string }) {
    return this._makeApiRequest<SpotifyApi.SingleArtistResponse>({
      method: "GET",
      url: `artist/${artist_id}`,
    });
  }

  public getPlaybackState() {
    return this._makeApiRequest<SpotifyApi.CurrentPlaybackResponse>({
      method: "GET",
      url: "me/player",
    });
  }

  public skipToNext({ device_id }: { device_id?: string }) {
    return this._makeApiRequest({
      method: "POST",
      url: "me/player/next",
      params: { device_id },
    });
  }

  public skipToPrevious({ device_id }: { device_id?: string }) {
    return this._makeApiRequest({
      method: "POST",
      url: "me/player/previous",
      params: { device_id },
    });
  }

  public pausePlayback({ device_id }: { device_id?: string }) {
    return this._makeApiRequest({
      method: "PUT",
      url: "me/player/pause",
      params: { device_id },
    });
  }

  public startPlayback({
    device_id,
    context_uri,
    uris,
    offset,
    position_ms,
  }: {
    device_id?: string;
    context_uri?: string;
    uris?: string[];
    offset: any;
    position_ms?: number;
  }) {
    return this._makeApiRequest({
      method: "PUT",
      url: "me/player/play",
      params: { device_id },
      data: {
        context_uri,
        uris,
        offset,
        position_ms,
      },
    });
  }

  public getAvailableDevices() {
    return this._makeApiRequest<SpotifyApi.UserDevicesResponse>({
      method: "GET",
      url: "me/player/devices",
    });
  }

  public getPlaylist({
    playlist_id,
    market,
    fields,
    additional_types,
  }: {
    playlist_id: string;
    market?: string;
    fields?: string;
    additional_types?: string;
  }) {
    return this._makeApiRequest<SpotifyApi.PlaylistObjectFull>({
      method: "GET",
      url: `playlists/${playlist_id}`,
      params: {
        market,
        fields,
        additional_types,
      },
    });
  }

  public getPlaylistItems({
    playlist_id,
    market,
    fields,
    limit,
    offset,
    additional_types,
  }: {
    playlist_id: string;
    market?: string;
    fields?: string;
    limit?: number;
    offset?: number;
    additional_types?: string;
  }) {
    return this._makeApiRequest<SpotifyApi.PlaylistTrackResponse>({
      method: "GET",
      url: `playlists/${playlist_id}/tracks`,
      params: {
        market,
        fields,
        limit,
        offset,
        additional_types,
      },
    });
  }

  public setVolume({
    volume_percent,
    device_id,
  }: {
    volume_percent: number;
    device_id?: string;
  }) {
    return this._makeApiRequest({
      method: "PUT",
      url: "me/player/volume",
      params: { volume_percent, device_id },
    });
  }

  public getCurrentUsersPlaylist(options?: {
    limit?: number;
    offset?: number;
  }) {
    return this._makeApiRequest<SpotifyApi.ListOfCurrentUsersPlaylistsResponse>(
      {
        method: "GET",
        url: "me/playlists",
        params: {
          limit: options?.limit,
          offset: options?.offset,
        },
      }
    );
  }

  // search for items
  public search({
    q,
    type,
    market,
    limit,
    offset,
  }: {
    q: string;
    type: string;
    market?: string;
    limit?: string;
    offset?: string;
  }) {
    return this._makeApiRequest<SpotifyApi.SearchResponse>({
      method: "GET",
      url: "search",
      params: {
        q,
        type,
        market,
        limit,
        offset,
      },
    });
  }

  // user profile
  public getCurrentUserProfile() {
    return this._makeApiRequest<SpotifyApi.UserProfileResponse>({
      method: "GET",
      url: "me",
    });
  }
}
