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
      const response = await fetch("http://192.168.1.103:3000/upload-photos", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload photo");
      }

      const result = await response.json();
      console.log("Upload successful:", result);
      setServerResult(result); // store server result in state
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
            <FlatList
              data={photos}
              keyExtractor={(_, index) => index.toString()}
              renderItem={renderPhoto}
            />
            <View style={{ padding: 10 }}>
              {serverResult?.items?.length > 0 ? (
                serverResult.items.map((item: string, index: number) => (
                  <Text key={index}>• {item}</Text>
                ))
              ) : (
                <Text>No items detected</Text>
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
});
