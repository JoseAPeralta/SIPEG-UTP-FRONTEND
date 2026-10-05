import { Box, Flex, useMediaQuery } from "@chakra-ui/react";
import { useCallback, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router";

import { ModuleShell } from "@/components";

import { resolvePersonalAreaSection } from "../model/personalAreaSections";

import { PersonalAreaNavigation } from "./PersonalAreaNavigation";

const DESKTOP_VIEWPORT_QUERY = "(min-width: 48em)";

/**
 * Common frame of the personal area. It owns the single `h1` of the area, the submenu and the `Outlet`
 * of the active section, so every section has its own route while keeping the same navigation.
 * Submenu visibility comes from `useMediaQuery` instead of a media query, so the expanded state is a
 * real state value that tests can observe and `Escape` can act on. Choosing a section closes the
 * mobile disclosure and moves focus to the destination heading, because a keyboard or screen reader
 * user would otherwise stay inside a menu that closed underneath them.
 *
 * The layout deliberately holds no React state: a section that is still loading suspends this render,
 * and React discards a pending state update of a suspended component, which would close the
 * disclosure under a user who just opened it. Focus intent therefore lives in a ref, which survives an
 * interrupted render, and the disclosure state belongs to `PersonalAreaNavigation`.
 */
export function PersonalAreaLayout() {
  const location = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [matchesDesktopViewport] = useMediaQuery([DESKTOP_VIEWPORT_QUERY]);
  const shouldFocusHeading = useRef(false);
  const isDesktop = matchesDesktopViewport ?? false;
  const activeSection = resolvePersonalAreaSection(location.pathname);

  useEffect(() => {
    if (!shouldFocusHeading.current) {
      return;
    }

    shouldFocusHeading.current = false;
    headingRef.current?.focus();
  }, [location.pathname]);

  const handleBeforeNavigate = useCallback(
    (path: string) => {
      if (path === location.pathname) {
        headingRef.current?.focus();
        return;
      }

      shouldFocusHeading.current = true;
    },
    [location.pathname],
  );

  return (
    <Box maxW="5xl" mx="auto" py={{ base: 3, md: 6 }}>
      <ModuleShell
        description="Consulte y mantenga los datos de su cuenta, su seguridad y los servicios asociados a su participacion."
        headingLabel="Mi perfil"
        headingRef={headingRef}
        title="Area personal"
      >
        <Flex align="start" direction={{ base: "column", md: "row" }} gap={{ base: 6, md: 8 }}>
          <Box flex="0 0 auto" w={{ base: "full", md: "17rem" }}>
            <PersonalAreaNavigation
              activeSectionId={activeSection.id}
              isDesktop={isDesktop}
              onBeforeNavigate={handleBeforeNavigate}
              toggleRef={toggleRef}
            />
          </Box>
          <Box flex="1 1 auto" minW={0} w="full">
            <Outlet />
          </Box>
        </Flex>
      </ModuleShell>
    </Box>
  );
}
