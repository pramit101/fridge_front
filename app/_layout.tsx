import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "../AuthProvider";

function RootLayoutNav() {
  const { user, loading } = useAuth();

  if (loading) return null; // or show splash screen

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {user ? (
        // Authenticated users see tabs
        <Stack.Screen name="index" />
      ) : (
        // Not logged in → show auth flow
        <Stack.Screen name="Login" />
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
