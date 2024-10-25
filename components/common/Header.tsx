import {
  Box,
  Button,
  Icon,
  Link,
  Text,
  useColorModeValue,
  useTheme,
} from "@interchain-ui/react";
import { Logo } from "./Logo";

const stacks = ["x42", "Epix"];

export function Header() {
  return (
    <>
      <Box textAlign="center">
        <Box display="flex" justifyContent="center" alignItems="flex-start" gap="$8">
          <Logo />
          <Text
            as="h1"
            fontWeight="$extrabold"
            fontSize={{ mobile: "$6xl", tablet: "$10xl" }}
          >
            Snapshot Claimer!
          </Text>
        </Box>
        <Text
          as="h2"
          fontWeight="$bold"
          attributes={{
            padding: "$12",
          }}
        >
          <Text
            as="span"
            fontSize={{ mobile: "$3xl", tablet: "$8xl", desktop: "$8xl" }}
          ></Text>
          <Text
            as="span"
            fontSize={{ mobile: "$3xl", tablet: "$8xl", desktop: "$8xl" }}
            color={useColorModeValue("$primary500", "$primary200")}
          >
            {stacks.join(" -> ")}
          </Text>
        </Text>
      </Box>
    </>
  );
}
