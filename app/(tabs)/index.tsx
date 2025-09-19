import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  FlatList,
  Image,
  ListRenderItem,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [serverResult, setServerResult] = useState<any>(null); // Added state
  const cameraRef = useRef<CameraView | null>(null);
  const [photosUploaded, setPhotosUploaded] = useState(false);

  const tabBarHeight = useBottomTabBarHeight();

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo?.uri) {
        setPhotos((prev) => [photo.uri, ...prev]);
      }
      setCameraOpen(false);
    }
  };

  const Item = ({ name, expiration }: { name: string; expiration: string }) => (
    <View style={styles.itemContainer}>
      <View style={styles.textContainer}>
        <Text style={styles.itemText}>• {name}</Text>
      </View>
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{expiration}</Text>
        <Ionicons name="caret-up-circle" size={24} color="#555" />
      </View>
    </View>
  );

  const uploadPhotos = async () => {
    if (photos.length === 0) {
      console.warn("No photos to upload");
      return;
    }

    const formData = new FormData();
    formData.append("file", {
      uri: photos[0],
      type: "image/jpeg",
      name: "fridge.jpg",
    } as any);

    try {
      const response = await fetch(
        "https://65c40c9e8f52.ngrok-free.app/upload-photos",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload photo");
      }

      const result = await response.json();
      console.log("Upload successful:", result);
      setServerResult(result);
      setPhotosUploaded(true); // <-- Set state to true on success
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
            {/* Conditional rendering based on photosUploaded state */}
            {!photosUploaded && (
              <FlatList
                data={photos}
                keyExtractor={(_, index) => index.toString()}
                renderItem={renderPhoto}
              />
            )}
            <View style={{ marginBottom: 200, paddingHorizontal: 20 }}>
              {serverResult?.items?.length > 0 ? (
                <FlatList
                  data={serverResult.items}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  renderItem={({ item }) => {
                    // Split the string into an array, e.g., ['milk', '5 days']
                    const [name, expiration] = item.split(" | ");
                    return <Item name={name} expiration={expiration} />;
                  }}
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
  preview: {
    width: "100%",
    height: 200,
    marginVertical: 10,
    borderRadius: 10,
  },
  buttonContainer2: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
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
  textContainer: {
    flex: 1,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 10,
  },
  itemText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  dateText: {
    fontSize: 14,
    color: "#555",
    marginRight: 5,
  },
  noItemsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 50,
  },
});
