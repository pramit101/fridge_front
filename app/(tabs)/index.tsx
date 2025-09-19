import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Link } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  FlatList,
  Image,
  ListRenderItem,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../AuthProvider";
import { auth } from "../../firebaseconfig";

// Define interface for items with adjustable expiration
interface FridgeItem {
  id: string;
  name: string;
  originalExpiration: string;
  adjustedDays: number;
  createdDate: string;
}

export default function HomeScreen() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [serverResult, setServerResult] = useState<any>(null);
  const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
  const cameraRef = useRef<CameraView | null>(null);
  const [photosUploaded, setPhotosUploaded] = useState(false);

  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  // Header component
  const Header = () => (
    <View style={styles.header}>
      {user ? (
        <>
          <Text style={styles.welcomeText}>👋 Hello, {user.email}</Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => signOut(auth)}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.authButtons}>
          <Link href="../Login" style={styles.linkButton}>
            <Text style={styles.linkText}>Login</Text>
          </Link>
          <Link href="../SignUp" style={styles.linkButton}>
            <Text style={styles.linkText}>Signup</Text>
          </Link>
        </View>
      )}
    </View>
  );

  // Process server result into fridgeItems
  useEffect(() => {
    if (serverResult?.items?.length > 0) {
      const processedItems: FridgeItem[] = serverResult.items.map(
        (item: string, index: number) => {
          const [name, expiration] = item.split(" | ");
          return {
            id: `${name}-${index}`,
            name,
            originalExpiration: expiration,
            adjustedDays: 0,
            createdDate: new Date().toISOString(),
          };
        }
      );
      setFridgeItems(processedItems);
    }
  }, [serverResult]);

  // Auto-update expiration days
  useEffect(() => {
    const updateDays = () => {
      const now = new Date();
      setFridgeItems((prevItems) =>
        prevItems.map((item) => {
          const daysPassed = Math.floor(
            (now.getTime() - new Date(item.createdDate).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          const expectedAdjustment = -daysPassed;
          return item.adjustedDays > expectedAdjustment
            ? { ...item, adjustedDays: expectedAdjustment }
            : item;
        })
      );
    };
    updateDays();
    const interval = setInterval(updateDays, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo?.uri) setPhotos((prev) => [photo.uri, ...prev]);
      setCameraOpen(false);
    }
  };

  const adjustExpirationDays = (itemId: string, change: number) => {
    setFridgeItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === itemId) {
          const daysPassed = Math.floor(
            (new Date().getTime() - new Date(item.createdDate).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          const minAdjustment = -daysPassed;
          const newAdjustment = Math.min(
            item.adjustedDays + change,
            minAdjustment + 999
          );
          return { ...item, adjustedDays: Math.max(-999, newAdjustment) };
        }
        return item;
      })
    );
  };

  const getDisplayExpiration = (item: FridgeItem) => {
    const match = item.originalExpiration.match(/(\d+)/);
    if (!match) return item.originalExpiration;
    const originalDays = parseInt(match[1]);
    const newDays = originalDays + item.adjustedDays;
    return newDays <= 0
      ? "Expired"
      : item.originalExpiration.replace(/\d+/, newDays.toString());
  };

  const Item = ({ item }: { item: FridgeItem }) => {
    const displayExpiration = getDisplayExpiration(item);
    const isExpired = displayExpiration === "Expired";

    const now = new Date();
    const daysPassed = Math.floor(
      (now.getTime() - new Date(item.createdDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const manualAdjustment = item.adjustedDays + daysPassed;

    return (
      <View
        style={[styles.itemContainer, isExpired && styles.expiredContainer]}
      >
        <View style={styles.textContainer}>
          <Text style={styles.itemText}>• {item.name}</Text>
          {daysPassed > 0 && (
            <Text style={styles.daysPassedText}>
              {daysPassed} day{daysPassed > 1 ? "s" : ""} old
            </Text>
          )}
        </View>
        <View style={styles.expirationControls}>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => adjustExpirationDays(item.id, -1)}
          >
            <Ionicons name="remove-circle" size={20} color="#ff6b6b" />
          </TouchableOpacity>
          <View
            style={[
              styles.dateContainer,
              isExpired && styles.expiredDateContainer,
            ]}
          >
            <Text style={[styles.dateText, isExpired && styles.expiredText]}>
              {displayExpiration}
            </Text>
            {manualAdjustment !== 0 && (
              <Text style={styles.adjustmentText}>
                ({manualAdjustment > 0 ? "+" : ""}
                {manualAdjustment})
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => adjustExpirationDays(item.id, 1)}
          >
            <Ionicons name="add-circle" size={20} color="#4ecdc4" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const uploadPhotos = async () => {
    if (photos.length === 0) return console.warn("No photos to upload");

    const formData = new FormData();
    formData.append("file", {
      uri: photos[0],
      type: "image/jpeg",
      name: "fridge.jpg",
    } as any);

    try {
      const response = await fetch("192.168.1.127:3000/upload-photos", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload photo");

      const result = await response.json();
      setServerResult(result);
      setPhotosUploaded(true);
    } catch (error) {
      console.error("Error uploading photo:", error);
    }
  };

  const renderPhoto: ListRenderItem<string> = ({ item }) => (
    <Image source={{ uri: item }} style={styles.preview} />
  );

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text>We need camera permission</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Page Header */}
        <Header />

        {cameraOpen ? (
          <CameraView
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: tabBarHeight - 25,
            }}
            ref={cameraRef}
            facing="back"
          >
            <View style={styles.buttonContainer}>
              <Button title="Snap" onPress={takePicture} />
              <Button title="Cancel" onPress={() => setCameraOpen(false)} />
            </View>
          </CameraView>
        ) : (
          <>
            <View style={styles.buttonContainer2}>
              <Button title="Open Camera" onPress={() => setCameraOpen(true)} />
              <Button title="Upload Photo" onPress={uploadPhotos} />
            </View>

            {!photosUploaded && (
              <FlatList
                data={photos}
                keyExtractor={(_, index) => index.toString()}
                renderItem={renderPhoto}
              />
            )}

            <View style={{ marginBottom: 200, paddingHorizontal: 20 }}>
              {fridgeItems.length > 0 ? (
                <FlatList
                  data={fridgeItems}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => <Item item={item} />}
                  contentContainerStyle={{ paddingTop: 20 }}
                />
              ) : (
                <Text style={styles.noItemsText}>No items detected</Text>
              )}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  buttonContainer: {
    display: "flex",
    flex: 1,
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    alignItems: "flex-end",
    marginBottom: 20,
  },
  buttonContainer2: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  preview: { width: "100%", height: 200, marginVertical: 10, borderRadius: 10 },
  itemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 15,
    padding: 15,
    marginVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  expiredContainer: {
    backgroundColor: "#ffe6e6",
    borderColor: "#ff6b6b",
    borderWidth: 1,
  },
  textContainer: { flex: 1 },
  expirationControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  adjustButton: { padding: 4 },
  dateContainer: {
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 80,
  },
  expiredDateContainer: { backgroundColor: "#ffcccc" },
  itemText: { fontSize: 18, fontWeight: "600", color: "#333" },
  dateText: { fontSize: 14, color: "#555", fontWeight: "500" },
  expiredText: { color: "#ff6b6b", fontWeight: "bold" },
  adjustmentText: { fontSize: 10, color: "#888", fontStyle: "italic" },
  daysPassedText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
    marginTop: 2,
  },
  noItemsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 50,
  },
  container2: { flex: 1, padding: 10 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  welcomeText: { fontSize: 16, fontWeight: "600", color: "#333" },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#ff6b6b",
    borderRadius: 8,
  },
  logoutText: { color: "#fff", fontWeight: "600" },
  authButtons: { flexDirection: "row", gap: 12 },
  linkButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#4ecdc4",
    borderRadius: 8,
  },
  linkText: { color: "#fff", fontWeight: "600" },
});
