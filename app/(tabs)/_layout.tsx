import { Tabs } from "expo-router";
import { t } from "@src/i18n";
import CustomTabBar from "@src/components/CustomTabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="today" options={{ title: t("tabs.today") }} />
      <Tabs.Screen name="calendar" options={{ title: t("tabs.calendar") }} />
      <Tabs.Screen name="grocery" options={{ title: t("tabs.grocery") }} />
      <Tabs.Screen name="home" options={{ title: t("tabs.home") }} />
      <Tabs.Screen name="settings" options={{ title: t("tabs.settings") }} />
      <Tabs.Screen
        name="kid/[kidId]"
        options={{
          href: null,
          headerShown: true,
          title: "",
        }}
      />
    </Tabs>
  );
}
