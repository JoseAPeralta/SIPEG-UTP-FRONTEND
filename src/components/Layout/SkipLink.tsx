import { Link } from "@chakra-ui/react";

export function SkipLink() {
  return (
    <Link
      bg="accent.solid"
      color="accent.contrast"
      href="#main-content"
      left="-100px"
      position="absolute"
      px={4}
      py={2}
      rounded="full"
      top="-100px"
      _focus={{ left: 4, position: "fixed", top: 4, zIndex: 9999 }}
    >
      Saltar al contenido
    </Link>
  );
}
