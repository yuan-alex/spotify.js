import "dotenv/config";
import { expect, test } from "vitest";

import Client from "../index";

const client = new Client({
  clientId: "test",
  redirectUri: "test",
  accessToken: process.env.TEST_SPOTIFY_OAUTH_TOKEN as string,
});

test("generateAuthorizeUrl", () => {
  expect(client.generateAuthorizeUrl()).toBe(
    "https://accounts.spotify.com/authorize?client_id=test&redirect_uri=test&response_type=code"
  );
});

test("getCurrentUserProfile", async () => {
  expect((await client.getCurrentUserProfile()).id).toBeDefined();
});

test("getCurrentUsersPlaylist", async () => {
  expect(await client.getCurrentUsersPlaylist()).toBeDefined();
});

test("searchForItems", async () => {
  const response = await client.search({ q: "the killers", type: "artist" });
  expect(response.artists?.items[0].name).equals("The Killers");
});
