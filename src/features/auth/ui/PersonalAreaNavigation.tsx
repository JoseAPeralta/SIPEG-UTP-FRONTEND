import { Box, Button, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { useCallback, useState, type KeyboardEvent, type RefObject } from "react";
import { NavLink } from "react-router";

import { Surface } from "@/components";

import { PERSONAL_AREA_SECTIONS, type PersonalAreaSectionId } from "../model/personalAreaSections";

export const PERSONAL_AREA_NAV_ID = "personal-area-sections";

export type PersonalAreaNavigationProps = {
  activeSectionId: PersonalAreaSectionId;
  isDesktop: boolean;
  /**
   * Runs before a section link navigates, so the owning layout can decide where focus lands. It is a
   * callback and not state: the disclosure state must not live above the route `Outlet`, because a
   * section that is still loading suspends that render and React discards the pending update, which
   * would close the menu under a user who just opened it.
   */
  onBeforeNavigate: (path: string) => void;
  toggleRef?: RefObject<HTMLButtonElement | null>;
};

function resolveSectionLabel(activeSectionId: PersonalAreaSectionId) {
  return PERSONAL_AREA_SECTIONS.find((section) => section.id === activeSectionId)?.label ?? "";
}

/**
 * Submenu of the personal area. Desktop keeps a persistent side navigation; mobile replaces it with a
 * local disclosure that keeps the current section name visible while collapsed and lists the four
 * sections vertically when opened. Visibility is decided by the layout instead of by a media query, so
 * the open state is a real state value that tests can observe and `Escape` can act on. The active
 * section is marked by `aria-current` and by a filled versus outlined shape, so color is never the
 * only cue, and every target keeps a 44 pixel minimum height.
 */
export function PersonalAreaNavigation({
  activeSectionId,
  isDesktop,
  onBeforeNavigate,
  toggleRef,
}: PersonalAreaNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isVisible = isDesktop || isMenuOpen;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (isDesktop || !isMenuOpen || event.key !== "Escape") {
        return;
      }

      setIsMenuOpen(false);
      toggleRef?.current?.focus();
    },
    [isDesktop, isMenuOpen, toggleRef],
  );

  const handleSelect = useCallback(
    (path: string) => {
      onBeforeNavigate(path);
      setIsMenuOpen(false);
    },
    [onBeforeNavigate],
  );

  return (
    <Stack gap={3} onKeyDown={handleKeyDown}>
      {isDesktop ? null : (
        <Surface padding="normal">
          <Stack gap={3}>
            <Box>
              <Text
                color="text.muted"
                fontSize="sm"
                fontWeight="800"
                letterSpacing="0.1em"
                textTransform="uppercase"
              >
                Seccion actual
              </Text>
              <Heading as="p" color="text.default" fontFamily="heading" fontSize="xl" mt={1}>
                {resolveSectionLabel(activeSectionId)}
              </Heading>
            </Box>
            <Button
              aria-controls={PERSONAL_AREA_NAV_ID}
              aria-expanded={isMenuOpen}
              colorPalette="terracotta"
              minH="44px"
              onClick={() => setIsMenuOpen((current) => !current)}
              ref={toggleRef}
              rounded="full"
              variant="outline"
              w="full"
            >
              {isMenuOpen ? "Ocultar secciones" : "Ver todas las secciones"}
            </Button>
          </Stack>
        </Surface>
      )}

      <Box
        as="nav"
        aria-label="Secciones del area personal"
        display={isVisible ? "block" : "none"}
        id={PERSONAL_AREA_NAV_ID}
      >
        <Flex as="ul" direction="column" gap={2} listStyle="none" m={0} p={0} w="full">
          {PERSONAL_AREA_SECTIONS.map((section) => (
            <Box as="li" key={section.id} w="full">
              <NavLink
                end
                onClick={() => handleSelect(section.path)}
                style={{ display: "block", textDecoration: "none" }}
                to={section.path}
              >
                {({ isActive }) => (
                  <Box
                    as="span"
                    alignItems="center"
                    bg={isActive ? "accent.solid" : "surface.raised"}
                    borderColor={isActive ? "accent.solid" : "border.subtle"}
                    borderWidth="1px"
                    color={isActive ? "accent.contrast" : "text.default"}
                    display="flex"
                    fontSize="sm"
                    fontWeight="800"
                    minH="44px"
                    px={4}
                    py={2.5}
                    rounded="xl"
                  >
                    {section.label}
                  </Box>
                )}
              </NavLink>
            </Box>
          ))}
        </Flex>
      </Box>
    </Stack>
  );
}
