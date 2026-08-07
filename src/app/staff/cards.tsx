import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, spacing } from '../../theme';
import { StaffHeader } from '../../components/StaffHeader';
import { QrBusinessCard } from '../../components/QrBusinessCard';
import { TEAM } from '../../constants/team';

export default function CardsScreen() {
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const cardWidth = width - (compact ? spacing.lg : spacing.xl) * 2;
  const people = TEAM.filter((p) => p.hasCard);

  return (
    <View style={styles.root}>
      <StaffHeader
        title="کارت ویزیت دیجیتال"
        subtitle="این صفحه را به مشتری نشان دهید تا مخاطب را اسکن و ذخیره کند"
      />
      <FlatList
        data={people}
        keyExtractor={(p) => p.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={width}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            <QrBusinessCard person={item} width={cardWidth} compact={compact} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  page: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xl,
  },
});
