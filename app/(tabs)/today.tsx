import { View, StyleSheet, ScrollView } from "react-native";
import { Card, Text, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { KIDS } from "@src/models/seed";
import { useFamilyStore } from "@src/store/useFamilyStore";

export default function TodayScreen() {
  const grocery = useFamilyStore((s) => s.grocery);
  const chores = useFamilyStore((s) => s.chores);
  const projects = useFamilyStore((s) => s.projects);
  const notes = useFamilyStore((s) => s.notes);

  const unboughtCount = grocery.filter((g) => !g.isBought).length;
  const undoneChores = chores.filter((c) => !c.done).length;
  const inProgressProjects = projects.filter(
    (p) => p.status === "in_progress"
  ).length;
  const pinnedNotes = notes.filter((n) => n.pinned).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineLarge" style={styles.title}>
          Today
        </Text>

        {/* Overview */}
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Today Overview
            </Text>
            <View style={styles.statsGrid}>
              <View style={[styles.stat, { backgroundColor: "#FFE0E0" }]}>
                <Text style={[styles.statNum, { color: "#FF6B6B" }]}>
                  {unboughtCount}
                </Text>
                <Text style={styles.statLabel}>Grocery items</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: "#D4F5F2" }]}>
                <Text style={[styles.statNum, { color: "#4ECDC4" }]}>
                  {undoneChores}
                </Text>
                <Text style={styles.statLabel}>Chores to do</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: "#E8E6FF" }]}>
                <Text style={[styles.statNum, { color: "#6C63FF" }]}>
                  {inProgressProjects}
                </Text>
                <Text style={styles.statLabel}>Active projects</Text>
              </View>
              <View style={[styles.stat, { backgroundColor: "#FFF3E0" }]}>
                <Text style={[styles.statNum, { color: "#FFA726" }]}>
                  {pinnedNotes}
                </Text>
                <Text style={styles.statLabel}>Pinned notes</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Kids */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Kids
        </Text>
        <View style={styles.kidsRow}>
          {KIDS.map((kid) => (
            <Chip
              key={kid.id}
              style={[styles.kidChip, { backgroundColor: kid.color + "22" }]}
              textStyle={{ color: kid.color, fontWeight: "700" }}
              icon={() => <Text style={{ fontSize: 18 }}>{kid.emoji}</Text>}
            >
              {kid.name}
            </Chip>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFE" },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontWeight: "800", color: "#1A1A2E", marginBottom: 20 },
  card: { borderRadius: 16, backgroundColor: "#FFFFFF", marginBottom: 24 },
  cardTitle: { fontWeight: "700", color: "#1A1A2E", marginBottom: 12 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  stat: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  statNum: { fontSize: 28, fontWeight: "800" },
  statLabel: { fontSize: 12, color: "#6B6B8D", marginTop: 2 },
  sectionTitle: { fontWeight: "700", color: "#1A1A2E", marginBottom: 12 },
  kidsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  kidChip: { borderRadius: 20 },
});
