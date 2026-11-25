import { Tabs } from "expo-router";
import { t } from "@src/i18n";
import CustomTabBar from "@src/components/CustomTabBar";
import BackHeader from "@src/components/BackHeader";

// Default landing tab for the group (e.g. when entering "/(tabs)" without a
// specific screen). The root index also redirects here.
export const unstable_settings = { initialRouteName: "today" };

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      // Every screen gets the slim back bar except the home launcher (the
      // main menu itself).
      screenOptions={{ headerShown: true, header: () => <BackHeader /> }}
    >
      <Tabs.Screen name="today" options={{ title: t("tabs.today") }} />
      <Tabs.Screen name="calendar" options={{ title: t("tabs.calendar") }} />
      <Tabs.Screen name="grocery" options={{ title: t("tabs.grocery") }} />
      <Tabs.Screen name="home" options={{ title: t("tabs.home"), headerShown: false }} />
      <Tabs.Screen name="settings" options={{ title: t("tabs.settings") }} />
      <Tabs.Screen name="notes" options={{ href: null }} />
      <Tabs.Screen name="chores" options={{ href: null }} />
      <Tabs.Screen name="projects" options={{ href: null }} />
      <Tabs.Screen
        name="kid/[kidId]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="customization"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="family" options={{ href: null }} />
      <Tabs.Screen name="documents" options={{ href: null }} />
      <Tabs.Screen
        name="parent/[memberId]"
        options={{ href: null }}
      />
      <Tabs.Screen name="budget" options={{ title: t("tabs.budget") }} />
    </Tabs>
  );
}
