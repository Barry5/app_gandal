import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useSettingsStore } from '../store';
import { useAuthStore } from '../store';

export default function SettingsScreen() {
  const { dataSaverMode, notificationsEnabled, playbackSpeed, quality, setDataSaverMode, setNotificationsEnabled, setPlaybackSpeed, setQuality } = useSettingsStore();
  const { logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lecture</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Mode économie de données</Text>
          <Switch value={dataSaverMode} onValueChange={setDataSaverMode} trackColor={{ true: '#6366f1' }} />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Lecture automatique</Text>
          <Switch value={true} trackColor={{ true: '#6366f1' }} />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Qualité vidéo</Text>
          <Text style={styles.settingValue}>{quality}</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Vitesse de lecture</Text>
          <Text style={styles.settingValue}>{playbackSpeed}x</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Activer les notifications</Text>
          <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ true: '#6366f1' }} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Modifier le profil</Text>
          <Text style={styles.menuArrow}>→</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Changer le mot de passe</Text>
          <Text style={styles.menuArrow}>→</Text>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Déconnexion</Text>
          <Text style={styles.menuArrow} onPress={logout}>→</Text>
        </View>
      </View>

      <Text style={styles.version}>Savoir-App v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  section: { backgroundColor: '#ffffff', marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 12 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  settingLabel: { fontSize: 16, color: '#0f172a' },
  settingValue: { fontSize: 14, color: '#6366f1', fontWeight: '600' },
  menuArrow: { fontSize: 16, color: '#94a3b8' },
  version: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 40, marginBottom: 40 },
});